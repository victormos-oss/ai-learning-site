import { posix } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import {
  lessonFrontmatterSchema,
  type LessonFrontmatter,
} from "../../../src/features/content/schema";
import { entryDir, type MappingEntry } from "../lib/mapping-schema";
import { parseMarkdown, stringifyMdx } from "../lib/mdast";
import { sourceDisplayName, type SourceEntry } from "../lib/sources-schema";
import { extractTitle } from "./extract-title";
import { inlineCodeFile } from "./inline-codefile";
import { rewriteImages, type AssetRef } from "./rewrite-images";
import { rewriteLinks } from "./rewrite-links";
import { stripHtmlComments } from "./strip-html-comments";
import { stripLangBar } from "./strip-lang-bar";
import { stripLeadingRules } from "./strip-leading-rules";
import { stripNavChain } from "./strip-nav-chain";
import { stripNextArrow } from "./strip-next-arrow";

export type { AssetRef } from "./rewrite-images";

export interface TransformInput {
  markdown: string;
  entry: MappingEntry;
  /** Every entry of the mapping, used to resolve links between sections. */
  entries: readonly MappingEntry[];
  track: string;
  source: SourceEntry;
  commit: string;
  /** Upstream files available next to the README, relative to the section folder. */
  assetFiles: readonly string[];
}

export interface TransformResult {
  frontmatter: LessonFrontmatter;
  /** MDX body without frontmatter. */
  body: string;
  /** Complete `en.mdx` content. */
  mdx: string;
  assets: AssetRef[];
  warnings: string[];
}

function buildFrontmatter(
  input: TransformInput,
  title: string,
  summary: string,
): LessonFrontmatter {
  const { entry, source, commit } = input;
  const repoUrl = source.url.replace(/\/$/, "");
  const sectionDir = entryDir(entry);
  return lessonFrontmatterSchema.parse({
    key: entry.key,
    slug: entry.slug,
    title,
    summary,
    order: entry.order,
    estimatedMinutes: entry.estimatedMinutes,
    type: "learn",
    quiz: false,
    attribution: [
      {
        source: sourceDisplayName(source),
        path: entry.from,
        commit,
        license: source.license,
        authors: source.authors,
        url: sectionDir
          ? `${repoUrl}/tree/${commit}/${sectionDir}`
          : `${repoUrl}/tree/${commit}`,
        relation: "adapted",
      },
    ],
  });
}

/** Markdown README from upstream -> validated frontmatter + MDX body. */
export function transformLesson(input: TransformInput): TransformResult {
  const { entry } = input;
  const cleaned = stripNextArrow(
    stripNavChain(stripLangBar(stripHtmlComments(parseMarkdown(input.markdown)))),
  );
  const titled = extractTitle(cleaned);
  const images = rewriteImages(stripLeadingRules(titled.tree), input.assetFiles);
  const linked = rewriteLinks(images.tree, {
    fromPath: entry.from,
    repoUrl: input.source.url.replace(/\/$/, ""),
    commit: input.commit,
    track: input.track,
    entries: input.entries,
  });
  const withCode = inlineCodeFile(
    linked,
    entry.code ? posix.basename(entry.code) : undefined,
  );

  const frontmatter = buildFrontmatter(input, titled.title, titled.summary);
  const body = stringifyMdx(withCode).trimEnd();
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 });
  return {
    frontmatter,
    body,
    mdx: `---\n${yaml}---\n\n${body}\n`,
    assets: images.assets,
    warnings: images.warnings,
  };
}
