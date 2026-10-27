import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { MarkCompleteButton } from "@/features/progress/MarkCompleteButton";
import type { ProgressState } from "@/features/progress/schema";
import {
  readStoredProgress,
  renderWithProgressIntl,
  resetStoredProgress,
} from "./helpers";

const KEY = "cc-zero.agent-loop";

function storedLesson() {
  return (readStoredProgress() as ProgressState | null)?.lessons[KEY];
}

describe("MarkCompleteButton", () => {
  beforeEach(() => {
    resetStoredProgress();
  });

  it("renders unpressed and marks the lesson as started on mount", async () => {
    renderWithProgressIntl(<MarkCompleteButton lessonKey={KEY} />);
    const button = screen.getByRole("button", { name: "Отметить пройденным" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(storedLesson()?.startedAt).toBeTruthy());
    expect(storedLesson()?.completedAt).toBeUndefined();
  });

  it("toggles completion, persists it and announces both directions", async () => {
    const user = userEvent.setup();
    renderWithProgressIntl(<MarkCompleteButton lessonKey={KEY} />);
    const button = screen.getByRole("button");
    const status = screen.getByRole("status");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Пройден");
    expect(storedLesson()?.completedAt).toBeTruthy();
    await waitFor(() => expect(status).toHaveTextContent("Урок отмечен как пройденный"));

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("Отметить пройденным");
    expect(storedLesson()?.completedAt).toBeUndefined();
    await waitFor(() => expect(status).toHaveTextContent("Отметка снята"));
  });
});
