import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/features/progress/schema";
import { markCompleted, markStarted } from "@/features/progress/reducers";
import {
  lessonStatus,
  nextLessonIndex,
  trackSummary,
} from "@/features/progress/selectors";

const T = "2026-10-01T10:00:00.000Z";
const KEYS = ["cc-zero.agent-loop", "cc-zero.tool-use", "cc-zero.permission"];
const [FIRST = "", SECOND = "", THIRD = ""] = KEYS;

describe("lessonStatus", () => {
  it("distinguishes new, started and completed lessons", () => {
    const started = markStarted(emptyProgress(T), SECOND, T);
    const state = markCompleted(started, THIRD, T);
    expect(lessonStatus(state, FIRST)).toBe("new");
    expect(lessonStatus(state, SECOND)).toBe("started");
    expect(lessonStatus(state, THIRD)).toBe("completed");
  });
});

describe("trackSummary", () => {
  it("counts completed lessons among the given keys only", () => {
    const one = markCompleted(emptyProgress(T), FIRST, T);
    const state = markCompleted(one, "other.lesson", T);
    expect(trackSummary(state, KEYS)).toEqual({ done: 1, total: 3, percent: 33 });
  });

  it("handles an empty key list without dividing by zero", () => {
    expect(trackSummary(emptyProgress(T), [])).toEqual({
      done: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe("nextLessonIndex", () => {
  it("points to the first lesson when nothing is completed", () => {
    expect(nextLessonIndex(emptyProgress(T), KEYS)).toBe(0);
  });

  it("skips completed lessons", () => {
    const state = markCompleted(emptyProgress(T), FIRST, T);
    expect(nextLessonIndex(state, KEYS)).toBe(1);
  });

  it("returns null when every lesson is completed", () => {
    const state = KEYS.reduce((acc, key) => markCompleted(acc, key, T), emptyProgress(T));
    expect(nextLessonIndex(state, KEYS)).toBeNull();
  });
});
