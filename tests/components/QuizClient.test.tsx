import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuizClient, type QuizLabels } from "@/features/quiz/QuizClient";
import { quizSchema } from "@/features/quiz/schema";

const quiz = quizSchema.parse({
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

const labels: QuizLabels = {
  heading: "Quiz",
  progress: (c, t) => `Question ${c} of ${t}`,
  check: "Check",
  next: "Next",
  retry: "Try again",
  correct: "Correct",
  incorrect: (a) => `Incorrect. The right answer: ${a}`,
  summary: (s, t) => `You answered ${s} of ${t} correctly.`,
  passed: "Quiz passed.",
  failed: "Below the pass mark.",
  englishOnly: "English only",
};

describe("QuizClient", () => {
  it("walks through questions with the keyboard and announces results", async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<QuizClient quiz={quiz} locale="en" labels={labels} onFinish={onFinish} />);

    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    const check = screen.getByRole("button", { name: "Check" });
    expect(check).toBeDisabled();

    await user.click(screen.getByLabelText(/No tool_use/));
    await user.click(check);
    expect(screen.getByRole("status")).toHaveTextContent("Correct");
    expect(screen.getByText("E1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    await user.click(screen.getByLabelText(/The model/));
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Incorrect. The right answer: The loop",
    );
    expect(onFinish).toHaveBeenCalledWith({
      version: 1,
      score: 1,
      total: 2,
      passed: false,
    });

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "You answered 1 of 2 correctly.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("marks the quiz as English when the locale has no translation", () => {
    render(<QuizClient quiz={quiz} locale="ru" labels={labels} />);
    expect(screen.getByText("English only")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Quiz" })).toHaveAttribute("lang", "en");
  });
});
