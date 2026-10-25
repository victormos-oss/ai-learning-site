import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { merge } from "node-diff3";
import { dirname, join, posix, relative } from "node:path";
import { expandGlob } from "../lib/glob";
import { entryDir, entryRelative, type Mapping, type MappingEntry } from "../lib/mapping-schema";
import type { SourceEntry } from "../lib/sources-schema";
import { transformLesson, type TransformResult } from "../transforms";
import { sanitizeSvg } from "../transforms/sanitize-svg";
import { normalizeNewlines } from "./hash";
import { lessonDir, upstreamFile, type ProjectPaths } from "./paths";

/** Upstream files that belong to one mapping entry, relative to the clone root. */
export interface EntryFiles {
  readme: string;
  code?: string;
  assets: string[];
}

export interface ApplyContext {
  paths: ProjectPaths;
  source: SourceEntry;
  mapping: Mapping;
  cloneDir: string;
  commit: string;
  /** Commit recorded in the lock before this run, used to rebuild the merge base. */
  previousCommit?: string;
}

export interface EntryApplyResult {
  written: string[];
  proposed: string[];
  conflicts: string[];
  warnings: string[];
}

export const EMPTY_RESULT: EntryApplyResult = { written: [], proposed: [], conflicts: [], warnings: [] };

export function collectEntryFiles(cloneDir: string, entry: MappingEntry): EntryFiles {
  const code = entry.code ? entryRelative(entry, entry.code) : undefined;
  if (code && !existsSync(join(cloneDir, code))) {
    throw new Error(`${entry.key}: mapped code file "${code}" is missing upstream`);
  }
  const assets = entry.assets.flatMap((pattern) => expandGlob(cloneDir, entryRelative(entry, pattern)));
  return { readme: entry.from, ...(code ? { code } : {}), assets };
}

export function listEntryPaths(files: EntryFiles): string[] {
  return [files.readme, ...(files.code ? [files.code] : []), ...files.assets];
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function copyRaw(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, readFileSync(from));
}

function relativeToRoot(ctx: ApplyContext, path: string): string {
  return relative(ctx.paths.root, path).replaceAll("\\", "/");
}

function transformReadme(
  ctx: ApplyContext,
  entry: MappingEntry,
  markdown: string,
  files: EntryFiles,
  commit: string,
): TransformResult {
  const dir = entryDir(entry);
  const assetFiles = files.assets.map((asset) => (dir ? posix.relative(dir, asset) : asset));
  return transformLesson({
    markdown,
    entry,
    entries: ctx.mapping.entries,
    track: ctx.mapping.track,
    source: ctx.source,
    commit,
    assetFiles,
  });
}

function writeLessonAssets(ctx: ApplyContext, entry: MappingEntry, result: TransformResult, dir: string): string[] {
  return result.assets.map((asset) => {
    const from = join(ctx.cloneDir, entryRelative(entry, asset.file));
    const target = join(dir, asset.target);
    // Only SVG is text; every other asset (png, webp) is copied as raw bytes.
    const raw = readFileSync(from);
    const content = asset.file.endsWith(".svg") ? sanitizeSvg(raw.toString("utf8")) : raw;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return relativeToRoot(ctx, target);
  });
}

function threeWayMerge(ours: string, base: string, theirs: string): { text: string; conflict: boolean } {
  const lines = (text: string) => normalizeNewlines(text).split("\n");
  const merged = merge(lines(ours), lines(base), lines(theirs), {
    label: { a: "ours (en.mdx)", o: "base", b: "upstream" },
  });
  return { text: merged.result.join("\n"), conflict: merged.conflict };
}

type MdxOutcome = "written" | "unchanged" | "proposed" | "conflict";

interface MdxInput {
  entry: MappingEntry;
  files: EntryFiles;
  markdown: string;
  previousMarkdown: string | undefined;
  result: TransformResult;
  dir: string;
}

/**
 * New lesson: write `en.mdx`. Existing lesson with changed upstream: write
 * `en.mdx.proposed` from a three-way merge (base = transform of the old
 * upstream copy). Unchanged upstream never touches a hand-edited `en.mdx`.
 */
function writeLessonMdx(ctx: ApplyContext, input: MdxInput): MdxOutcome {
  const target = join(input.dir, "en.mdx");
  const existing = readIfExists(target);
  if (existing === undefined) {
    writeText(target, input.result.mdx);
    return "written";
  }
  if (normalizeNewlines(existing) === normalizeNewlines(input.result.mdx)) return "unchanged";
  const upstreamUnchanged =
    input.previousMarkdown !== undefined &&
    normalizeNewlines(input.previousMarkdown) === normalizeNewlines(input.markdown);
  if (upstreamUnchanged) return "unchanged";
  if (input.previousMarkdown === undefined) {
    writeText(`${target}.proposed`, input.result.mdx);
    return "proposed";
  }
  const baseCommit = ctx.previousCommit ?? ctx.commit;
  const base = transformReadme(ctx, input.entry, input.previousMarkdown, input.files, baseCommit).mdx;
  const merged = threeWayMerge(existing, base, input.result.mdx);
  writeText(`${target}.proposed`, merged.text);
  return merged.conflict ? "conflict" : "proposed";
}

/** Imports one lesson: upstream copy, assets, code, and en.mdx (or a merge proposal). */
export function applyEntry(ctx: ApplyContext, entry: MappingEntry): EntryApplyResult {
  const files = collectEntryFiles(ctx.cloneDir, entry);
  const previousMarkdown = readIfExists(upstreamFile(ctx.paths, ctx.source.id, files.readme));
  for (const path of listEntryPaths(files)) {
    copyRaw(join(ctx.cloneDir, path), upstreamFile(ctx.paths, ctx.source.id, path));
  }
  const markdown = readFileSync(join(ctx.cloneDir, files.readme), "utf8");
  const result = transformReadme(ctx, entry, markdown, files, ctx.commit);
  const dir = lessonDir(ctx.paths, ctx.mapping.track, entry);

  const assetPaths = writeLessonAssets(ctx, entry, result, dir);
  const codePaths = files.code ? [join(dir, posix.basename(files.code))] : [];
  codePaths.forEach((target) => copyRaw(join(ctx.cloneDir, files.code ?? ""), target));

  const outcome = writeLessonMdx(ctx, { entry, files, markdown, previousMarkdown, result, dir });
  const mdx = relativeToRoot(ctx, join(dir, "en.mdx"));
  return {
    written: [...assetPaths, ...codePaths.map((p) => relativeToRoot(ctx, p)), ...(outcome === "written" ? [mdx] : [])],
    proposed: outcome === "proposed" || outcome === "conflict" ? [`${mdx}.proposed`] : [],
    conflicts: outcome === "conflict" ? [`${mdx}.proposed`] : [],
    warnings: result.warnings.map((warning) => `${entry.key}: ${warning}`),
  };
}

export function mergeResults(results: readonly EntryApplyResult[]): EntryApplyResult {
  return results.reduce(
    (acc, result) => ({
      written: [...acc.written, ...result.written],
      proposed: [...acc.proposed, ...result.proposed],
      conflicts: [...acc.conflicts, ...result.conflicts],
      warnings: [...acc.warnings, ...result.warnings],
    }),
    EMPTY_RESULT,
  );
}
