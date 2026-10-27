import { z } from "zod";
import {
  accessLevelSchema,
  attributionSchema,
  contentKeySchema,
  localeSchema,
  localizedStringSchema,
  slugSchema,
  translationMetaSchema,
} from "./common";

export const lessonTypeSchema = z.enum(["learn", "build", "practice"]);

const lessonBaseSchema = z.object({
  key: contentKeySchema,
  slug: slugSchema,
  title: z.string().min(1).max(120),
  /** Short name for the departures board, per language; the board falls back to `title`. */
  boardTitle: localizedStringSchema.optional(),
  summary: z.string().min(1).max(400),
  order: z.number().int().positive(),
  access: accessLevelSchema.optional(),
  estimatedMinutes: z.number().int().positive().max(600).optional(),
  type: lessonTypeSchema.default("learn"),
  quiz: z.boolean().default(false),
  practice: contentKeySchema.optional(),
  translation: translationMetaSchema.optional(),
  attribution: z.array(attributionSchema).min(1),
});

export const lessonFrontmatterSchema = lessonBaseSchema;
export type LessonFrontmatter = z.infer<typeof lessonFrontmatterSchema>;

/**
 * Validates frontmatter against the locale derived from the file name:
 * non-English lessons must declare how they were translated.
 */
export function validateLessonForLocale(
  frontmatter: unknown,
  locale: z.infer<typeof localeSchema>,
): LessonFrontmatter {
  const parsed = lessonFrontmatterSchema.parse(frontmatter);
  if (locale !== "en" && !parsed.translation) {
    throw new Error(
      `${parsed.key}: ${locale} lesson must declare translation.status and sourceHash`,
    );
  }
  return parsed;
}
