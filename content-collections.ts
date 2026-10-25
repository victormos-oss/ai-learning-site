import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import rehypeShiki from "@shikijs/rehype";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { codeToHtml } from "shiki";
import { z } from "zod";
import {
  lessonFrontmatterSchema,
  localeSchema,
  moduleSchema,
  trackSchema,
} from "./src/features/content/schema";

const CONTENT_ROOT = "content/tracks";
const CODE_EXTENSIONS = new Set([".py", ".ts", ".js", ".json", ".sh", ".md"]);
/* The code surface is dark in both site themes, so one dark Shiki theme is enough. */
const SHIKI_THEME = "github-dark";
const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".py": "python",
  ".ts": "typescript",
  ".js": "javascript",
  ".json": "json",
  ".sh": "bash",
  ".md": "markdown",
};

/**
 * Lesson path inside content/tracks:
 *   <track>/modules/<module-dir>/lessons/<lesson-dir>/<locale>.mdx
 */
/** content-collections reports directories with the OS separator; normalize to "/". */
function segments(directory: string): string[] {
  return directory.split(/[\\/]/);
}

function parseLessonPath(directory: string, fileName: string) {
  const [trackDir, , moduleDir, , lessonDir] = segments(directory);
  const locale = localeSchema.parse(fileName.replace(/\.mdx$/, ""));
  if (!trackDir || !moduleDir || !lessonDir) {
    throw new Error(`Unexpected lesson location: ${directory}/${fileName}`);
  }
  return { trackDir, moduleDir, lessonDir, locale };
}

function sha256(input: string): string {
  return `sha256:${createHash("sha256").update(input, "utf8").digest("hex")}`;
}

function listAssets(lessonDir: string): string[] {
  const dir = join(lessonDir, "assets");
  return existsSync(dir) ? readdirSync(dir).sort() : [];
}

async function readCodeFiles(
  lessonDir: string,
): Promise<Record<string, { content: string; html: string }>> {
  const entries = readdirSync(lessonDir).filter((name) =>
    [...CODE_EXTENSIONS].some((ext) => name.endsWith(ext)),
  );
  const files = await Promise.all(
    entries.map(async (name) => {
      const content = readFileSync(join(lessonDir, name), "utf8");
      const ext = name.slice(name.lastIndexOf("."));
      const html = await codeToHtml(content, {
        lang: LANGUAGE_BY_EXTENSION[ext] ?? "text",
        theme: SHIKI_THEME,
      });
      return [name, { content, html }] as const;
    }),
  );
  return Object.fromEntries(files);
}

const tracks = defineCollection({
  name: "tracks",
  directory: CONTENT_ROOT,
  include: "*/track.yaml",
  parser: "yaml",
  schema: trackSchema,
  transform: (doc) => ({ ...doc, trackDir: segments(doc._meta.directory)[0] ?? "" }),
});

const modules = defineCollection({
  name: "modules",
  directory: CONTENT_ROOT,
  include: "*/modules/*/module.yaml",
  parser: "yaml",
  schema: moduleSchema,
  transform: (doc) => {
    const [trackDir, , moduleDir] = segments(doc._meta.directory);
    return { ...doc, trackDir: trackDir ?? "", moduleDir: moduleDir ?? "" };
  },
});

const lessons = defineCollection({
  name: "lessons",
  directory: CONTENT_ROOT,
  include: "*/modules/*/lessons/*/*.mdx",
  schema: lessonFrontmatterSchema.extend({ content: z.string() }),
  transform: async (doc, context) => {
    const { trackDir, moduleDir, lessonDir, locale } = parseLessonPath(
      doc._meta.directory,
      doc._meta.fileName,
    );
    const moduleMeta = context
      .documents(modules)
      .find((m) => segments(m._meta.directory).join("/") === `${trackDir}/modules/${moduleDir}`);
    if (!moduleMeta)
      throw new Error(`${doc.key}: module.yaml not found for ${moduleDir}`);
    if (locale !== "en" && !doc.translation) {
      throw new Error(`${doc.key}: ${locale} lesson needs translation metadata`);
    }
    const lessonPath = join(CONTENT_ROOT, doc._meta.directory);
    const body = await compileMDX(context, doc, {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeShiki, { theme: SHIKI_THEME }],
      ],
    });
    const headings = [...doc.content.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1] ?? "");
    return {
      ...doc,
      locale,
      trackDir,
      moduleDir,
      lessonDir,
      moduleKey: moduleMeta.key,
      access: doc.access ?? moduleMeta.access,
      contentHash: sha256(doc.content),
      headings,
      assets: listAssets(lessonPath),
      codeFiles: await readCodeFiles(lessonPath),
      body,
    };
  },
});

export default defineConfig({
  content: [tracks, modules, lessons],
});
