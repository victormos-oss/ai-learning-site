import type { Quiz, QuizLocale, QuizQuestion } from "./schema";

export type Answers = Readonly<Record<string, number | undefined>>;

export type QuestionResult = {
  id: string;
  chosen: number | undefined;
  correct: number;
  isCorrect: boolean;
};

export type QuizResult = {
  results: QuestionResult[];
  score: number;
  total: number;
  passed: boolean;
};

/** Pure grading: compares chosen option indexes with the shared correct index. */
export function gradeQuiz(quiz: Quiz, answers: Answers): QuizResult {
  const results = quiz.questions.map((question) => {
    const chosen = answers[question.id];
    return {
      id: question.id,
      chosen,
      correct: question.correct,
      isCorrect: chosen !== undefined && chosen === question.correct,
    };
  });
  const score = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  return { results, score, total, passed: total > 0 && score / total >= quiz.passRatio };
}

/** Text of a question in the requested language, English when untranslated. */
export function questionText(question: QuizQuestion, locale: QuizLocale) {
  const translated = question.i18n[locale];
  return { text: translated ?? question.i18n.en, isFallback: !translated };
}
