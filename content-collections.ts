import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import rehypeShiki from "@shikijs/rehype";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkGuard from "./src/features/mdx/plugins/remark-guard";
import { collectHeadings } from "./src/features/content/headings";
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
  const localeResult = localeSchema.safeParse(fileName.replace(/\.mdx$/, ""));
  if (!localeResult.success) {
    throw new Error(`Lesson file must be <locale>.mdx (en, ru, es), got ${directory}/${fileName}`);
  }
  const locale = localeResult.data;
  if (!trackDir || !moduleDir || !lessonDir) {
    throw new Error(`Unexpected lesson location: ${directory}/${fileName}`);
  }
  return { trackDir, moduleDir, lessonDir, locale };
}

/** CRLF checkouts on Windows must hash the same as LF checkouts in CI. */
function normalizeNewlines(text: string): string {
  return text.split("\r\n").join("\n");
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

/* Code files are highlighted once per lesson folder, not once per locale. */
const codeFileCache = new Map<string, Promise<Record<string, { content: string; html: string }>>>();
function readCodeFilesCached(lessonDir: string) {
  const cached = codeFileCache.get(lessonDir);
  if (cached) return cached;
  const pending = readCodeFiles(lessonDir);
  codeFileCache.set(lessonDir, pending);
  return pending;
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
      remarkPlugins: [remarkGuard, remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeShiki, { theme: SHIKI_THEME }],
      ],
    });
    const headings = collectHeadings(doc.content);
    return {
      ...doc,
      locale,
      trackDir,
      moduleDir,
      lessonDir,
      moduleKey: moduleMeta.key,
      access: doc.access ?? moduleMeta.access,
      contentHash: sha256(normalizeNewlines(doc.content)),
      headings,
      assets: listAssets(lessonPath),
      codeFiles: await readCodeFilesCached(lessonPath),
      body,
    };
  },
});

export default defineConfig({
  content: [tracks, modules, lessons],
});
