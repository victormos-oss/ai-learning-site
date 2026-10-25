import { existsSync } from "node:fs";
import { join } from "node:path";
import type { SourceEntry } from "../lib/sources-schema";

/**
 * Resolves the clone directory for a source. Only local clones are supported
 * for now: `--from-local <dir>` points at the folder that holds them, and
 * `source.local` names the clone inside it.
 */
export function resolveCloneDir(source: SourceEntry, fromLocal: string | undefined): string {
  if (!fromLocal) {
    throw new Error(
      [
        `Network clone of "${source.id}" is not implemented yet.`,
        "Pass --from-local <dir> pointing at the folder with local clones",
        `(expected "${source.local}" inside it, see \`local\` in sources.yaml).`,
      ].join(" "),
    );
  }
  const dir = join(fromLocal, source.local);
  if (!existsSync(dir)) {
    throw new Error(`Local clone for "${source.id}" not found at ${dir}`);
  }
  return dir;
}
