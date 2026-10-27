"use client";

import { progressActions } from "@/features/progress";
import { nowIso } from "@/features/progress/schema";
import { Quiz } from "./Quiz";
import type { Quiz as QuizData, QuizLocale } from "./schema";

type Props = {
  quiz: QuizData;
  locale: QuizLocale;
  lessonKey: string;
};

/**
 * The quiz as placed inside a lesson: when the last question is checked, the
 * result is written into the learner's progress for this lesson key.
 */
export function LessonQuiz({ quiz, locale, lessonKey }: Props) {
  return (
    <Quiz
      quiz={quiz}
      locale={locale}
      onFinish={(result) =>
        progressActions.recordQuiz(lessonKey, { ...result, at: nowIso() })
      }
    />
  );
}
