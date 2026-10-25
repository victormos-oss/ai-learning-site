import { z } from "zod";

export const localeSchema = z.enum(["en", "ru", "es"]);
export type ContentLocale = z.infer<typeof localeSchema>;

export const accessLevelSchema = z.enum(["PUBLIC", "ACCOUNT", "PREMIUM"]);
export type AccessLevel = z.infer<typeof accessLevelSchema>;

export const translationStatusSchema = z.enum(["machine", "reviewed", "stale"]);

/** Stable key such as `cc-zero.agent-loop`: dotted segments, lowercase, no spaces. */
export const contentKeySchema = z
  .string()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "key must look like track.lesson");

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

export const localizedStringSchema = z.object({
  en: z.string().min(1),
  ru: z.string().min(1).optional(),
  es: z.string().min(1).optional(),
});
export type LocalizedString = z.infer<typeof localizedStringSchema>;

export const attributionRelationSchema = z.enum([
  "adapted",
  "translated",
  "quoted",
  "original",
]);

export const attributionSchema = z.object({
  source: z.string().min(1),
  path: z.string().min(1).optional(),
  commit: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/)
    .optional(),
  license: z.string().min(1),
  authors: z.string().min(1),
  url: z.string().url(),
  relation: attributionRelationSchema,
});
export type Attribution = z.infer<typeof attributionSchema>;

export const translationMetaSchema = z.object({
  status: translationStatusSchema,
  sourceHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
});
