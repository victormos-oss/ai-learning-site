import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const sourceUseSchema = z.enum(["adapt", "quote", "link"]);
export type SourceUse = z.infer<typeof sourceUseSchema>;

export const sourceSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    url: z.string().url(),
    local: z.string().min(1),
    license: z.string().min(1),
    authors: z.string().min(1),
    copyright: z.string().optional(),
    use: sourceUseSchema,
    enabled: z.boolean().default(true),
    include: z.array(z.string()).default([]),
    exclude: z.array(z.string()).default([]),
    languages: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .loose();
export type SourceEntry = z.infer<typeof sourceSchema>;

export const sourcesFileSchema = z.object({ sources: z.array(sourceSchema).min(1) });

export function parseSources(yamlText: string): SourceEntry[] {
  return sourcesFileSchema.parse(parseYaml(yamlText)).sources;
}

export function loadSources(filePath: string): SourceEntry[] {
  return parseSources(readFileSync(filePath, "utf8"));
}

export function findSource(sources: readonly SourceEntry[], id: string): SourceEntry {
  const source = sources.find((candidate) => candidate.id === id);
  if (!source) throw new Error(`Unknown source "${id}" (not in sources.yaml)`);
  return source;
}

/** `owner/repo` for GitHub URLs, otherwise the registry name. */
export function sourceDisplayName(source: SourceEntry): string {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/.exec(source.url);
  return match ? `${match[1]}/${match[2]}` : source.name;
}
