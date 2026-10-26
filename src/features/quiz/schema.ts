import { z } from "zod";

const localizedQuestion = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  explanation: z.string().min(1),
});

export const quizQuestionSchema = z
  .object({
    id: z.string().regex(/^q[0-9]+$/),
    stage: z.enum(["pre", "check", "post"]),
    /** Index into `options`, shared by every language. */
    correct: z.number().int().nonnegative(),
    i18n: z.object({
      en: localizedQuestion,
      ru: localizedQuestion.optional(),
      es: localizedQuestion.optional(),
    }),
  })
  .superRefine((q, ctx) => {
    const count = q.i18n.en.options.length;
    if (q.correct >= count) {
      ctx.addIssue({ code: "custom", message: `${q.id}: correct index out of range` });
    }
    for (const locale of ["ru", "es"] as const) {
      const translated = q.i18n[locale];
      if (translated && translated.options.length !== count) {
        ctx.addIssue({
          code: "custom",
          message: `${q.id}: ${locale} has ${translated.options.length} options, en has ${count}`,
        });
      }
    }
  });

export const quizSchema = z.object({
  lesson: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/),
  version: z.number().int().positive(),
  passRatio: z.number().min(0).max(1).default(0.7),
  questions: z.array(quizQuestionSchema).min(1).max(12),
});

export type Quiz = z.infer<typeof quizSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type QuizLocale = "en" | "ru" | "es";
