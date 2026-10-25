import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { z } from "zod";

const hashSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);

export const sourceLockSchema = z.object({
  commit: z.string().regex(/^[0-9a-f]{7,40}$/),
  updatedAt: z.string().datetime(),
  files: z.record(z.string(), hashSchema),
});
export type SourceLock = z.infer<typeof sourceLockSchema>;

export const lockFileSchema = z.object({
  version: z.literal(1),
  sources: z.record(z.string(), sourceLockSchema),
});
export type LockFile = z.infer<typeof lockFileSchema>;

export const EMPTY_LOCK: LockFile = { version: 1, sources: {} };

export function readLock(filePath: string): LockFile {
  if (!existsSync(filePath)) return EMPTY_LOCK;
  return lockFileSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
}

function sortedRecord<T>(record: Readonly<Record<string, T>>): Record<string, T> {
  // Byte-order compare keeps the lock identical across machines and locales.
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

export interface LockUpdate {
  sourceId: string;
  commit: string;
  updatedAt: string;
  /** Hashes of every file processed in this run. */
  files: Readonly<Record<string, string>>;
  /** Locked paths that disappeared upstream and must leave the lock. */
  removed: readonly string[];
}

/** Returns a new lock with one source updated; files outside this run are kept. */
export function mergeLock(lock: LockFile, update: LockUpdate): LockFile {
  const previous = lock.sources[update.sourceId]?.files ?? {};
  const kept = Object.fromEntries(
    Object.entries(previous).filter(([path]) => !update.removed.includes(path)),
  );
  return {
    version: 1,
    sources: sortedRecord({
      ...lock.sources,
      [update.sourceId]: {
        commit: update.commit,
        updatedAt: update.updatedAt,
        files: sortedRecord({ ...kept, ...update.files }),
      },
    }),
  };
}

export function writeLock(filePath: string, lock: LockFile): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(lockFileSchema.parse(lock), null, 2)}\n`);
}
