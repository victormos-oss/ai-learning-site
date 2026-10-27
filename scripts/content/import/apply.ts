import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { merge } from "node-diff3";
import { dirname, join, posix, relative, sep } from "node:path";
import { expandGlob } from "../lib/glob";
import {
  entryDir,
  entryRelative,
  type Mapping,
  type MappingEntry,
} from "../lib/mapping-schema";
import type { SourceEntry } from "../lib/sources-schema";
import { transformLesson, type ExtraDocument, type TransformResult } from "../transforms";
import { looksLikeSvg, sanitizeSvg } from "../transforms/sanitize-svg";
import { normalizeNewlines } from "./hash";
import { lessonDir, upstreamFile, type ProjectPaths } from "./paths";

/** Upstream files that belong to one mapping entry, relative to the clone root. */
export interface EntryFiles {
  readme: string;
  /** `alsoFrom` files, in mapping order. */
  extras: string[];
  code?: string;
  assets: string[];
}

/** Markdown inputs of one lesson as read from one place (clone or pinned copy). */
export interface LessonSource {
  markdown: string;
  extras: ExtraDocument[];
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

export const EMPTY_RESULT: EntryApplyResult = {
  written: [],
  proposed: [],
  conflicts: [],
  warnings: [],
};

/**
 * The clone is untrusted: a mapped path must be a regular file (no symlink)
 * whose real location stays inside the clone. Returns the absolute path.
 */
export function assertRegularFileInside(rootDir: string, relativePath: string): string {
  const full = join(rootDir, relativePath);
  const stat = lstatSync(full, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) {
    throw new Error(`"${relativePath}" is not a regular file in the upstream clone`);
  }
  const realRoot = realpathSync(rootDir);
  const real = realpathSync(full);
  if (real !== realRoot && !real.startsWith(realRoot + sep)) {
    throw new Error(`"${relativePath}" resolves outside the upstream clone`);
  }
  return full;
}

export function collectEntryFiles(cloneDir: string, entry: MappingEntry): EntryFiles {
  const code = entry.code ? entryRelative(entry, entry.code) : undefined;
  if (code && !existsSync(join(cloneDir, code))) {
    throw new Error(`${entry.key}: mapped code file "${code}" is missing upstream`);
  }
  assertRegularFileInside(cloneDir, entry.from);
  entry.alsoFrom.forEach((extra) => assertRegularFileInside(cloneDir, extra));
  if (code) assertRegularFileInside(cloneDir, code);
  const assets = entry.assets.flatMap((pattern) =>
    expandGlob(cloneDir, entryRelative(entry, pattern)),
  );
  assets.forEach((asset) => assertRegularFileInside(cloneDir, asset));
  return {
    readme: entry.from,
    extras: entry.alsoFrom,
    ...(code ? { code } : {}),
    assets,
  };
}

export function listEntryPaths(files: EntryFiles): string[] {
  return [
    files.readme,
    ...files.extras,
    ...(files.code ? [files.code] : []),
    ...files.assets,
  ];
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}

/** Reads README and extras from the clone; every mapped file must exist. */
function readCloneSource(cloneDir: string, files: EntryFiles): LessonSource {
  const read = (path: string) =>
    readFileSync(assertRegularFileInside(cloneDir, path), "utf8");
  return {
    markdown: read(files.readme),
    extras: files.extras.map((path) => ({ path, markdown: read(path) })),
  };
}

/** Reads the pinned copy; `undefined` when any file is missing, so no merge base is guessed. */
function readPinnedSource(
  ctx: ApplyContext,
  files: EntryFiles,
): LessonSource | undefined {
  const read = (path: string) =>
    readIfExists(upstreamFile(ctx.paths, ctx.source.id, path));
  const markdown = read(files.readme);
  const extras = files.extras.flatMap((path) => {
    const text = read(path);
    return text === undefined ? [] : [{ path, markdown: text }];
  });
  if (markdown === undefined || extras.length !== files.extras.length) return undefined;
  return { markdown, extras };
}

function sameSource(a: LessonSource, b: LessonSource): boolean {
  const text = (source: LessonSource) =>
    [source.markdown, ...source.extras.map((extra) => extra.markdown)]
      .map(normalizeNewlines)
      .join("\u0000");
  return text(a) === text(b);
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
  source: LessonSource,
  files: EntryFiles,
  commit: string,
): TransformResult {
  const dir = entryDir(entry);
  const assetFiles = files.assets.map((asset) =>
    dir ? posix.relative(dir, asset) : asset,
  );
  return transformLesson({
    markdown: source.markdown,
    extras: source.extras,
    entry,
    entries: ctx.mapping.entries,
    track: ctx.mapping.track,
    source: ctx.source,
    commit,
    assetFiles,
  });
}

function writeLessonAssets(
  ctx: ApplyContext,
  entry: MappingEntry,
  result: TransformResult,
  dir: string,
): string[] {
  return result.assets.map((asset) => {
    const from = assertRegularFileInside(ctx.cloneDir, entryRelative(entry, asset.file));
    const target = join(dir, asset.target);
    // SVG (by extension in any case, or by content) is sanitized; other assets are raw bytes.
    const raw = readFileSync(from);
    const isSvg = /\.svg$/i.test(asset.file) || looksLikeSvg(raw);
    const content = isSvg ? sanitizeSvg(raw.toString("utf8")) : raw;
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    return relativeToRoot(ctx, target);
  });
}

function threeWayMerge(
  ours: string,
  base: string,
  theirs: string,
): { text: string; conflict: boolean } {
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
  source: LessonSource;
  previous: LessonSource | undefined;
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
  if (normalizeNewlines(existing) === normalizeNewlines(input.result.mdx))
    return "unchanged";
  if (input.previous && sameSource(input.previous, input.source)) return "unchanged";
  if (input.previous === undefined) {
    writeText(`${target}.proposed`, input.result.mdx);
    return "proposed";
  }
  const baseCommit = ctx.previousCommit ?? ctx.commit;
  const base = transformReadme(
    ctx,
    input.entry,
    input.previous,
    input.files,
    baseCommit,
  ).mdx;
  const merged = threeWayMerge(existing, base, input.result.mdx);
  writeText(`${target}.proposed`, merged.text);
  return merged.conflict ? "conflict" : "proposed";
}

/**
 * Imports one lesson: assets, code and en.mdx (or a merge proposal). The
 * pinned upstream copy is refreshed last, only after the lesson files were
 * written, so a failure half-way never makes a later run believe the
 * upstream change was already applied.
 */
export function applyEntry(ctx: ApplyContext, entry: MappingEntry): EntryApplyResult {
  const files = collectEntryFiles(ctx.cloneDir, entry);
  const previous = readPinnedSource(ctx, files);
  const source = readCloneSource(ctx.cloneDir, files);
  const result = transformReadme(ctx, entry, source, files, ctx.commit);
  const dir = lessonDir(ctx.paths, ctx.mapping.track, entry);

  const assetPaths = writeLessonAssets(ctx, entry, result, dir);
  const codePaths: string[] = [];
  if (files.code) {
    const target = join(dir, posix.basename(files.code));
    copyRaw(assertRegularFileInside(ctx.cloneDir, files.code), target);
    codePaths.push(target);
  }

  const outcome = writeLessonMdx(ctx, { entry, files, source, previous, result, dir });
  for (const path of listEntryPaths(files)) {
    copyRaw(join(ctx.cloneDir, path), upstreamFile(ctx.paths, ctx.source.id, path));
  }
  const mdx = relativeToRoot(ctx, join(dir, "en.mdx"));
  return {
    written: [
      ...assetPaths,
      ...codePaths.map((p) => relativeToRoot(ctx, p)),
      ...(outcome === "written" ? [mdx] : []),
    ],
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
