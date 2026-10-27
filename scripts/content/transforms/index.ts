import type { Root, RootContent } from "mdast";
import { posix } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import {
  lessonFrontmatterSchema,
  type LessonFrontmatter,
} from "../../../src/features/content/schema";
import { entryDir, type MappingEntry } from "../lib/mapping-schema";
import { parseMarkdown, stringifyMdx } from "../lib/mdast";
import { sourceDisplayName, type SourceEntry } from "../lib/sources-schema";
import { appendExtras, headingFromFileName, type ExtraSection } from "./append-extras";
import { extractTitle } from "./extract-title";
import { inlineCodeFile } from "./inline-codefile";
import { mkdocsAdmonitions } from "./mkdocs-admonitions";
import { rewriteImages, type AssetRef } from "./rewrite-images";
import { rewriteLinks, type LinkContext } from "./rewrite-links";
import { stripHtmlComments } from "./strip-html-comments";
import { stripLangBar } from "./strip-lang-bar";
import { stripLeadingRules } from "./strip-leading-rules";
import {
  seeAlsoHeading,
  splitSeeAlso,
  stripMaterialNav,
  stripMkdocsFrontmatter,
} from "./strip-mkdocs-front";
import { stripNavChain } from "./strip-nav-chain";
import { stripNextArrow } from "./strip-next-arrow";
import { withChildren } from "./tree";

export type { AssetRef } from "./rewrite-images";

/** An `alsoFrom` file of the entry with its upstream content. */
export interface ExtraDocument {
  /** Path relative to the clone root. */
  path: string;
  markdown: string;
}

export interface TransformInput {
  markdown: string;
  /** Contents of `entry.alsoFrom`, in mapping order. */
  extras?: readonly ExtraDocument[];
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

interface PreparedDocument {
  tree: Root;
  title: string;
  summary: string;
  seeAlso: RootContent[];
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
    type: entry.type,
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

/** Noise shared by GitHub READMEs and mkdocs guides, before the title is read. */
function cleanMarkdown(markdown: string): Root {
  const parsed = parseMarkdown(stripMkdocsFrontmatter(markdown));
  const stripped = stripNextArrow(stripNavChain(stripLangBar(stripHtmlComments(parsed))));
  return mkdocsAdmonitions(stripMaterialNav(stripped));
}

function linkContext(input: TransformInput, fromPath: string): LinkContext {
  return {
    fromPath,
    repoUrl: input.source.url.replace(/\/$/, ""),
    commit: input.commit,
    track: input.track,
    entries: input.entries,
  };
}

/** One upstream markdown file -> body tree with title, summary and a detached See Also. */
function prepareDocument(
  input: TransformInput,
  markdown: string,
  fromPath: string,
): PreparedDocument {
  const titled = extractTitle(cleanMarkdown(markdown));
  const images = rewriteImages(stripLeadingRules(titled.tree), input.assetFiles);
  const linked = rewriteLinks(images.tree, linkContext(input, fromPath));
  const split = splitSeeAlso(linked);
  return {
    tree: split.tree,
    title: titled.title,
    summary: titled.summary,
    seeAlso: split.seeAlso,
    assets: images.assets,
    warnings: images.warnings,
  };
}

interface PreparedExtra {
  section: ExtraSection;
  warnings: string[];
}

function prepareExtra(input: TransformInput, extra: ExtraDocument): PreparedExtra {
  const prepared = prepareDocument(input, extra.markdown, extra.path);
  return {
    section: { heading: headingFromFileName(extra.path), tree: prepared.tree },
    warnings: prepared.warnings.map((warning) => `${extra.path}: ${warning}`),
  };
}

/** Main body, then the appended extras, then the main document's See Also list. */
function assembleBody(main: PreparedDocument, extras: readonly ExtraSection[]): Root {
  const joined = appendExtras(main.tree, extras);
  if (main.seeAlso.length === 0) return joined;
  return withChildren(joined, [...joined.children, seeAlsoHeading(), ...main.seeAlso]);
}

/** Markdown README from upstream -> validated frontmatter + MDX body. */
export function transformLesson(input: TransformInput): TransformResult {
  const { entry } = input;
  const main = prepareDocument(input, input.markdown, entry.from);
  const extras = (input.extras ?? []).map((extra) => prepareExtra(input, extra));
  const sections = extras.map((extra) => extra.section);
  const withCode = inlineCodeFile(
    assembleBody(main, sections),
    entry.code ? posix.basename(entry.code) : undefined,
  );

  const frontmatter = buildFrontmatter(input, main.title, main.summary);
  const body = stringifyMdx(withCode).trimEnd();
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 });
  return {
    frontmatter,
    body,
    mdx: `---\n${yaml}---\n\n${body}\n`,
    assets: main.assets,
    warnings: [...main.warnings, ...extras.flatMap((extra) => extra.warnings)],
  };
}
