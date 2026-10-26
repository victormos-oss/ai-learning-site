import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  entryDir,
  loadMapping,
  type Mapping,
  type MappingEntry,
} from "../lib/mapping-schema";
import { loadSources, type SourceEntry } from "../lib/sources-schema";
import {
  applyEntry,
  collectEntryFiles,
  listEntryPaths,
  mergeResults,
  type EntryApplyResult,
} from "./apply";
import { compareHashes, formatChangeTable, type Comparison } from "./compare";
import { buildReport, type FileDiff } from "./diff-report";
import { resolveCloneDir } from "./fetch-source";
import { hashFile, isTextFile } from "./hash";
import { mergeLock, readLock, writeLock, type LockFile } from "./lock";
import {
  mappingFile,
  projectPaths,
  reportFile,
  upstreamFile,
  type ProjectPaths,
} from "./paths";

export type RunMode = "check" | "apply";

export interface RunOptions {
  root: string;
  mode: RunMode;
  sourceId?: string;
  only?: string;
  fromLocal?: string;
  now?: Date;
  /** Injected in tests; defaults to `git rev-parse HEAD` in the clone. */
  resolveCommit?: (cloneDir: string) => string;
  log?: (line: string) => void;
}

export interface SourceRunResult {
  sourceId: string;
  commit: string;
  comparison: Comparison;
  apply?: EntryApplyResult;
}

export interface RunResult {
  exitCode: number;
  sources: SourceRunResult[];
  reportPath?: string;
}

export const EXIT_OK = 0;
export const EXIT_CHANGES = 1;
export const EXIT_CONFLICT = 2;

function gitHead(cloneDir: string): string {
  return execFileSync("git", ["-C", cloneDir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function selectSources(
  sources: readonly SourceEntry[],
  paths: ProjectPaths,
  sourceId?: string,
): SourceEntry[] {
  if (sourceId) {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) throw new Error(`Unknown source "${sourceId}"`);
    if (!existsSync(mappingFile(paths, sourceId)))
      throw new Error(`No mapping file for "${sourceId}"`);
    return [source];
  }
  return sources.filter(
    (s) => s.use === "adapt" && s.enabled && existsSync(mappingFile(paths, s.id)),
  );
}

function selectEntries(mapping: Mapping, only?: string): MappingEntry[] {
  if (!only) return mapping.entries;
  const entries = mapping.entries.filter((entry) => entry.key === only);
  if (entries.length === 0) throw new Error(`No mapping entry with key "${only}"`);
  return entries;
}

function hashEntries(
  cloneDir: string,
  entries: readonly MappingEntry[],
): Record<string, string> {
  const paths = entries.flatMap((entry) =>
    listEntryPaths(collectEntryFiles(cloneDir, entry)),
  );
  return Object.fromEntries(paths.map((path) => [path, hashFile(join(cloneDir, path))]));
}

/** Locked hashes that belong to the processed entries, so `--only` never reports the rest as REMOVED. */
function scopedLock(
  lock: LockFile,
  sourceId: string,
  entries: readonly MappingEntry[],
): Record<string, string> {
  const dirs = entries.map((entry) => entryDir(entry));
  const files = lock.sources[sourceId]?.files ?? {};
  return Object.fromEntries(
    Object.entries(files).filter(([path]) =>
      dirs.some((dir) => dir === "" || path.startsWith(`${dir}/`)),
    ),
  );
}

function collectDiffs(
  paths: ProjectPaths,
  sourceId: string,
  cloneDir: string,
  comparison: Comparison,
): FileDiff[] {
  return comparison.changes
    .filter((change) => change.status === "CHANGED" && isTextFile(change.path))
    .flatMap((change) => {
      const previous = upstreamFile(paths, sourceId, change.path);
      if (!existsSync(previous)) return [];
      const before = readFileSync(previous, "utf8");
      const after = readFileSync(join(cloneDir, change.path), "utf8");
      return [{ path: change.path, before, after }];
    });
}

interface SourceRun {
  result: SourceRunResult;
  lock: LockFile;
  report: string;
}

function runSource(
  options: RunOptions,
  paths: ProjectPaths,
  source: SourceEntry,
  lock: LockFile,
): SourceRun {
  const log = options.log ?? (() => undefined);
  const now = options.now ?? new Date();
  const mapping = loadMapping(mappingFile(paths, source.id), source);
  const entries = selectEntries(mapping, options.only);
  const cloneDir = resolveCloneDir(source, options.fromLocal);
  const commit = (options.resolveCommit ?? gitHead)(cloneDir);
  const current = hashEntries(cloneDir, entries);
  const comparison = compareHashes(current, scopedLock(lock, source.id, entries));
  const diffs = collectDiffs(paths, source.id, cloneDir, comparison);
  log(`## ${source.id} @ ${commit.slice(0, 7)}`);
  log(formatChangeTable(comparison));

  if (options.mode === "check") {
    // Check never writes a report; the change table above is its whole output.
    return { result: { sourceId: source.id, commit, comparison }, lock, report: "" };
  }

  const previousCommit = lock.sources[source.id]?.commit;
  if (options.only && previousCommit && previousCommit !== commit) {
    throw new Error(
      `--only would mix commits in the lock: locked ${previousCommit.slice(0, 7)}, ` +
        `clone at ${commit.slice(0, 7)}. Run a full --apply for "${source.id}" first.`,
    );
  }
  const ctx = {
    paths,
    source,
    mapping,
    cloneDir,
    commit,
    ...(previousCommit ? { previousCommit } : {}),
  };
  const updatedAt = now.toISOString();
  // The lock is written after every entry, so a failure half-way keeps the finished ones recorded.
  const applied = entries.reduce<{ lock: LockFile; results: EntryApplyResult[] }>(
    (acc, entry) => {
      const result = applyEntry(ctx, entry);
      const files = hashEntries(cloneDir, [entry]);
      const entryLock = mergeLock(acc.lock, {
        sourceId: source.id,
        commit,
        updatedAt,
        files,
        removed: [],
      });
      writeLock(paths.lockFile, entryLock);
      return { lock: entryLock, results: [...acc.results, result] };
    },
    { lock, results: [] },
  );
  const apply = mergeResults(applied.results);
  const removed = comparison.changes
    .filter((c) => c.status === "REMOVED")
    .map((c) => c.path);
  const nextLock = mergeLock(applied.lock, {
    sourceId: source.id,
    commit,
    updatedAt: now.toISOString(),
    files: current,
    removed,
  });
  const report = buildReport({
    date: now,
    sourceId: source.id,
    commit,
    mode: "apply",
    comparison,
    diffs,
    apply,
  });
  return {
    result: { sourceId: source.id, commit, comparison, apply },
    lock: nextLock,
    report,
  };
}

function exitCodeFor(mode: RunMode, results: readonly SourceRunResult[]): number {
  if (mode === "check")
    return results.some((r) => r.comparison.hasChanges) ? EXIT_CHANGES : EXIT_OK;
  return results.some((r) => (r.apply?.conflicts.length ?? 0) > 0)
    ? EXIT_CONFLICT
    : EXIT_OK;
}

/** Runs `--check` or `--apply` over the selected sources. Only `--apply` writes files. */
export function runImport(options: RunOptions): RunResult {
  const paths = projectPaths(options.root);
  const sources = selectSources(loadSources(paths.sourcesFile), paths, options.sourceId);
  const initialLock = readLock(paths.lockFile);

  const runs = sources.reduce<SourceRun[]>((acc, source) => {
    const lock = acc.at(-1)?.lock ?? initialLock;
    return [...acc, runSource(options, paths, source, lock)];
  }, []);
  const results = runs.map((run) => run.result);

  if (options.mode === "check")
    return { exitCode: exitCodeFor("check", results), sources: results };

  const finalLock = runs.at(-1)?.lock ?? initialLock;
  writeLock(paths.lockFile, finalLock);
  const reportPath = reportFile(paths, options.now ?? new Date());
  mkdirSync(paths.reportsDir, { recursive: true });
  writeFileSync(reportPath, runs.map((run) => run.report).join("\n---\n\n"));
  return { exitCode: exitCodeFor("apply", results), sources: results, reportPath };
}
