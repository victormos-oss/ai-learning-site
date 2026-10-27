import { z } from "zod";

/*
 * Shape of the learner's progress as stored in the browser. Lessons are keyed
 * by the frontmatter `key` (for example `cc-zero.agent-loop`), so renaming a
 * slug never loses progress.
 */

export const SCHEMA_VERSION = 1;

/** Stable epoch stamp used for the server snapshot, which must never change. */
export const EPOCH_ISO = "1970-01-01T00:00:00.000Z";

const isoDateSchema = z.iso.datetime();

/** Same pattern as the content key: dotted lowercase segments. */
export const lessonKeySchema = z
  .string()
  .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "lesson key must look like track.lesson");

export const quizResultSchema = z.object({
  version: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  passed: z.boolean(),
  at: isoDateSchema,
});
export type QuizResult = z.infer<typeof quizResultSchema>;

export const lessonProgressSchema = z.object({
  startedAt: isoDateSchema.optional(),
  completedAt: isoDateSchema.optional(),
  quiz: quizResultSchema.optional(),
  practiceDoneAt: isoDateSchema.optional(),
});
export type LessonProgress = z.infer<typeof lessonProgressSchema>;

export const progressStateSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  updatedAt: isoDateSchema,
  lessons: z.record(lessonKeySchema, lessonProgressSchema),
});
export type ProgressState = z.infer<typeof progressStateSchema>;

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyProgress(updatedAt: string = nowIso()): ProgressState {
  return { schemaVersion: SCHEMA_VERSION, updatedAt, lessons: {} };
}

/** Frozen empty state shared by server rendering and hydration. */
export const EMPTY_PROGRESS: ProgressState = Object.freeze(
  emptyProgress(EPOCH_ISO),
) as ProgressState;
