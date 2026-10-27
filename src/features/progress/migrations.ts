import { progressStateSchema, SCHEMA_VERSION, type ProgressState } from "./schema";

export type MigrationFailure = "invalid-data" | "unsupported-version";

export type MigrationResult =
  { ok: true; state: ProgressState } | { ok: false; reason: MigrationFailure };

type Versioned = { schemaVersion: number } & Record<string, unknown>;

/** Each entry upgrades a state from its key version to the next one. */
type Migration = (input: Versioned) => Versioned;

/*
 * Chain of migrations keyed by the version they upgrade from. Version 1 is the
 * first one, so the chain is empty for now; a future `2` would add
 * `1: (v1) => ({ ...v1, schemaVersion: 2, ... })` here and nothing else.
 */
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map();

function isVersioned(input: unknown): input is Versioned {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as { schemaVersion?: unknown }).schemaVersion === "number"
  );
}

function upgrade(input: Versioned): Versioned | null {
  let current = input;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS.get(current.schemaVersion);
    if (!step) return null;
    current = step(current);
  }
  return current;
}

/** Brings any stored or imported object up to the current schema, or says why it cannot. */
export function migrateProgress(input: unknown): MigrationResult {
  if (!isVersioned(input)) return { ok: false, reason: "invalid-data" };
  if (input.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported-version" };
  }
  const upgraded = upgrade(input);
  if (!upgraded) return { ok: false, reason: "unsupported-version" };
  const parsed = progressStateSchema.safeParse(upgraded);
  if (!parsed.success) return { ok: false, reason: "invalid-data" };
  return { ok: true, state: parsed.data };
}
