import { z } from "zod";
import { EXPORT_FORMAT, EXPORT_VERSION } from "./export";
import { migrateProgress } from "./migrations";
import type { ProgressState } from "./schema";

const KIB = 1024;
export const MAX_IMPORT_BYTES = 256 * KIB;

export type ImportFailure =
  | "too-large"
  | "not-json"
  | "wrong-format"
  | "unsupported-version"
  | "invalid-data"
  | "read-failed";

export type ImportResult =
  { ok: true; state: ProgressState } | { ok: false; reason: ImportFailure };

const envelopeSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.number().int(),
  data: z.unknown(),
});

function parseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Validates the export envelope, then migrates and validates the payload. */
export function parseProgressExport(text: string): ImportResult {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    return { ok: false, reason: "too-large" };
  }
  const json = parseJson(text);
  if (json === undefined) return { ok: false, reason: "not-json" };
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success) return { ok: false, reason: "wrong-format" };
  if (envelope.data.version !== EXPORT_VERSION) {
    return { ok: false, reason: "unsupported-version" };
  }
  const migrated = migrateProgress(envelope.data.data);
  if (!migrated.ok) return { ok: false, reason: "invalid-data" };
  return { ok: true, state: migrated.state };
}

/** Reads a user-picked file; the size is checked before any bytes are read. */
export async function readProgressFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, reason: "too-large" };
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, reason: "read-failed" };
  }
  return parseProgressExport(text);
}
