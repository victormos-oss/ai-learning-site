"use client";

import { useTranslations } from "next-intl";
import { QuizClient } from "./QuizClient";
import type { Quiz as QuizData, QuizLocale } from "./schema";

type Props = {
  quiz: QuizData;
  locale: QuizLocale;
  onFinish?: (result: {
    version: number;
    score: number;
    total: number;
    passed: boolean;
  }) => void;
};

/** Binds the quiz component to the lesson message namespace. */
export function Quiz({ quiz, locale, onFinish }: Props) {
  const t = useTranslations("lesson.quiz");
  return (
    <QuizClient
      quiz={quiz}
      locale={locale}
      onFinish={onFinish}
      labels={{
        heading: t("heading"),
        progress: (current, total) => t("progress", { current, total }),
        check: t("check"),
        next: t("next"),
        retry: t("retry"),
        correct: t("correct"),
        incorrect: (answer) => t("incorrect", { answer }),
        summary: (score, total) => t("summary", { score, total }),
        passed: t("passed"),
        failed: t("failed"),
        englishOnly: t("englishOnly"),
      }}
    />
  );
}
