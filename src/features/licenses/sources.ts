import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/*
 * Read at build time by the licenses page. The registry is the same file the
 * import pipeline uses, so the page can never drift from what was imported.
 */

const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  license: z.string(),
  authors: z.string(),
  copyright: z.string().optional(),
  use: z.enum(["adapt", "quote", "link"]),
  enabled: z.boolean().default(true),
  notes: z.string().optional(),
});
export type LicensedSource = z.infer<typeof sourceSchema>;

const registrySchema = z.object({ sources: z.array(sourceSchema) });

const SOURCES_FILE = join(process.cwd(), "content", "sources", "sources.yaml");
const LICENSES_DIR = join(process.cwd(), "content", "sources", "licenses");

export function readSources(file = SOURCES_FILE): LicensedSource[] {
  const parsed = registrySchema.safeParse(parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new Error(`content/sources/sources.yaml is invalid: ${parsed.error.message}`);
  }
  return parsed.data.sources;
}

/** Full license text when the project keeps a copy (MIT today); null otherwise. */
export function readLicenseText(license: string, dir = LICENSES_DIR): string | null {
  const file = join(dir, `${license.replace(/[^A-Za-z0-9.-]/g, "")}.txt`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

export type GroupedSources = {
  adapted: LicensedSource[];
  quoted: LicensedSource[];
  linked: LicensedSource[];
};

export function groupSources(sources: readonly LicensedSource[]): GroupedSources {
  return {
    adapted: sources.filter((s) => s.use === "adapt" && s.enabled),
    quoted: sources.filter((s) => s.use === "quote"),
    linked: sources.filter((s) => s.use === "link" || (s.use === "adapt" && !s.enabled)),
  };
}
