import { describe, expect, it } from "vitest";
import { gradeQuiz, questionText } from "@/features/quiz/grade";
import { quizSchema, type Quiz } from "@/features/quiz/schema";

const quiz: Quiz = quizSchema.parse({
  lesson: "cc-zero.agent-loop",
  version: 1,
  questions: [
    {
      id: "q1",
      stage: "pre",
      correct: 1,
      i18n: {
        en: {
          question: "What stops the loop?",
          options: ["A timer", "No tool_use block"],
          explanation: "The loop exits when the model stops calling tools.",
        },
        ru: {
          question: "Что останавливает цикл?",
          options: ["Таймер", "Отсутствие блока tool_use"],
          explanation: "Цикл выходит, когда модель перестаёт вызывать инструменты.",
        },
      },
    },
    {
      id: "q2",
      stage: "check",
      correct: 0,
      i18n: {
        en: {
          question: "Who runs the command?",
          options: ["The loop", "The model itself"],
          explanation: "The model only proposes; the loop executes.",
        },
      },
    },
  ],
});

describe("gradeQuiz", () => {
  it("scores answers and applies the pass ratio", () => {
    const result = gradeQuiz(quiz, { q1: 1, q2: 0 });
    expect(result.score).toBe(2);
    expect(result.total).toBe(2);
    expect(result.passed).toBe(true);
  });

  it("treats missing answers as wrong and fails below the ratio", () => {
    const result = gradeQuiz(quiz, { q1: 1 });
    expect(result.results[1]?.isCorrect).toBe(false);
    expect(result.passed).toBe(false);
  });
});

describe("questionText", () => {
  it("falls back to English and says so", () => {
    expect(questionText(quiz.questions[1]!, "ru")).toEqual({
      text: quiz.questions[1]!.i18n.en,
      isFallback: true,
    });
    expect(questionText(quiz.questions[0]!, "ru").isFallback).toBe(false);
  });
});

describe("quizSchema", () => {
  it("rejects a correct index outside the options and mismatched option counts", () => {
    expect(() =>
      quizSchema.parse({
        lesson: "cc-zero.x",
        version: 1,
        questions: [
          {
            id: "q1",
            stage: "pre",
            correct: 5,
            i18n: { en: { question: "?", options: ["a", "b"], explanation: "e" } },
          },
        ],
      }),
    ).toThrow(/out of range/);
    expect(() =>
      quizSchema.parse({
        lesson: "cc-zero.x",
        version: 1,
        questions: [
          {
            id: "q1",
            stage: "pre",
            correct: 0,
            i18n: {
              en: { question: "?", options: ["a", "b"], explanation: "e" },
              ru: { question: "?", options: ["a"], explanation: "e" },
            },
          },
        ],
      }),
    ).toThrow(/ru has 1 options/);
  });
});
