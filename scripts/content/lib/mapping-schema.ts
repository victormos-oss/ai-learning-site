import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { contentKeySchema, slugSchema } from "../../../src/features/content/schema";
import { matchesAnyGlob } from "./glob";
import type { SourceEntry } from "./sources-schema";

/** Relative posix path without traversal: no `..` segments, drive letters, backslashes or leading `/`. */
const safeRelativePath = z
  .string()
  .min(1)
  .refine(
    (p) => !/^[\\/]|^[A-Za-z]:|\\/.test(p) && !p.split("/").includes(".."),
    "path must be relative, posix and without `..`",
  );

export const mappingEntrySchema = z.object({
  from: safeRelativePath,
  key: contentKeySchema,
  module: z
    .string()
    .regex(/^\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/, "module must look like 02-one-agent"),
  slug: slugSchema,
  order: z.number().int().positive(),
  code: safeRelativePath.optional(),
  assets: z.array(safeRelativePath).default([]),
  estimatedMinutes: z.number().int().positive().max(600),
});
export type MappingEntry = z.infer<typeof mappingEntrySchema>;

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const found = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) found.add(value);
    seen.add(value);
  }
  return [...found];
}

export const mappingFileSchema = z
  .object({
    source: z.string().regex(/^[a-z0-9-]+$/),
    track: slugSchema,
    entries: z.array(mappingEntrySchema).min(1),
  })
  .superRefine((mapping, ctx) => {
    for (const key of duplicates(mapping.entries.map((entry) => entry.key))) {
      ctx.addIssue({
        code: "custom",
        message: `duplicate key "${key}"`,
        path: ["entries"],
      });
    }
    for (const slug of duplicates(mapping.entries.map((entry) => entry.slug))) {
      ctx.addIssue({
        code: "custom",
        message: `duplicate slug "${slug}"`,
        path: ["entries"],
      });
    }
    const orders = mapping.entries.map((entry) => `${entry.module}#${entry.order}`);
    for (const order of duplicates(orders)) {
      ctx.addIssue({
        code: "custom",
        message: `duplicate order ${order}`,
        path: ["entries"],
      });
    }
  });
export type Mapping = z.infer<typeof mappingFileSchema>;

/** Directory of the upstream section (`s01_agent_loop`), relative to the clone root. */
export function entryDir(entry: MappingEntry): string {
  const dir = posix.dirname(entry.from);
  return dir === "." ? "" : dir;
}

/** Resolves a path given relative to the entry directory (`code.py`, `images/*`). */
export function entryRelative(entry: MappingEntry, relativePath: string): string {
  const dir = entryDir(entry);
  return dir ? posix.join(dir, relativePath) : relativePath;
}

/** Lesson folder name such as `01-agent-loop`. */
export function lessonDirName(entry: MappingEntry): string {
  return `${String(entry.order).padStart(2, "0")}-${entry.slug}`;
}

function isAllowedPath(path: string, source: SourceEntry): boolean {
  const included = source.include.length === 0 || matchesAnyGlob(path, source.include);
  return included && !matchesAnyGlob(path, source.exclude);
}

/** Cross-checks a mapping against its registry entry; returns human-readable problems. */
export function mappingProblems(mapping: Mapping, source: SourceEntry): string[] {
  if (mapping.source !== source.id) {
    return [`mapping is for "${mapping.source}" but source "${source.id}" was given`];
  }
  if (source.use === "link") {
    return [`source "${source.id}" is use: link, importing from it is forbidden`];
  }
  const files = mapping.entries.flatMap((entry) => [
    entry.from,
    ...(entry.code ? [entryRelative(entry, entry.code)] : []),
    ...entry.assets.map((asset) => entryRelative(entry, asset)),
  ]);
  return files
    .filter((file) => !isAllowedPath(file, source))
    .map((file) => `"${file}" is outside the include/exclude rules of "${source.id}"`);
}

export function parseMapping(yamlText: string, source: SourceEntry): Mapping {
  const mapping = mappingFileSchema.parse(parseYaml(yamlText));
  const problems = mappingProblems(mapping, source);
  if (problems.length > 0) throw new Error(problems.join("\n"));
  return mapping;
}

export function loadMapping(filePath: string, source: SourceEntry): Mapping {
  return parseMapping(readFileSync(filePath, "utf8"), source);
}
