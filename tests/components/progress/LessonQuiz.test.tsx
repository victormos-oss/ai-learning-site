import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";
import ru from "../../../messages/ru/lesson.json";
import type { ProgressState } from "@/features/progress/schema";
import { LessonQuiz } from "@/features/quiz/LessonQuiz";
import { quizSchema } from "@/features/quiz/schema";
import { readStoredProgress, resetStoredProgress } from "./helpers";

const KEY = "cc-zero.agent-loop";

const quiz = quizSchema.parse({
  lesson: KEY,
  version: 1,
  questions: [
    {
      id: "q1",
      stage: "pre",
      correct: 1,
      i18n: {
        en: {
          question: "What stops the loop?",
          options: ["A timer", "No tool_use"],
          explanation: "E1",
        },
      },
    },
    {
      id: "q2",
      stage: "check",
      correct: 0,
      i18n: {
        en: {
          question: "Who runs it?",
          options: ["The loop", "The model"],
          explanation: "E2",
        },
      },
    },
  ],
});

function storedQuiz() {
  return (readStoredProgress() as ProgressState | null)?.lessons[KEY]?.quiz;
}

describe("LessonQuiz", () => {
  beforeEach(() => {
    resetStoredProgress();
  });

  it("writes the result into the lesson progress when the last question is checked", async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="ru" messages={{ lesson: ru }} timeZone="UTC">
        <LessonQuiz quiz={quiz} locale="ru" lessonKey={KEY} />
      </NextIntlClientProvider>,
    );
    expect(storedQuiz()).toBeUndefined();

    await user.click(screen.getByLabelText(/No tool_use/));
    await user.click(screen.getByRole("button", { name: "Проверить" }));
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await user.click(screen.getByLabelText(/The model/));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    await waitFor(() => expect(storedQuiz()).toBeTruthy());
    expect(storedQuiz()).toMatchObject({ version: 1, score: 1, total: 2, passed: false });
    expect(typeof storedQuiz()?.at).toBe("string");
  });
});
