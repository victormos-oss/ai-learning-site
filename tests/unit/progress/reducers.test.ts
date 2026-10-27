import { describe, expect, it } from "vitest";
import { emptyProgress, type ProgressState } from "@/features/progress/schema";
import {
  markCompleted,
  markPractice,
  markStarted,
  mergeProgress,
  recordQuiz,
  resetProgress,
  unmarkCompleted,
} from "@/features/progress/reducers";

const KEY = "cc-zero.agent-loop";
const T1 = "2026-10-01T10:00:00.000Z";
const T2 = "2026-10-02T10:00:00.000Z";
const T3 = "2026-10-03T10:00:00.000Z";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const inner of Object.values(value as Record<string, unknown>)) {
      deepFreeze(inner);
    }
  }
  return value;
}

function frozenEmpty(): ProgressState {
  return deepFreeze(emptyProgress(T1));
}

describe("markStarted", () => {
  it("records startedAt once and leaves the frozen input untouched", () => {
    const initial = frozenEmpty();
    const next = markStarted(initial, KEY, T2);
    expect(next.lessons[KEY]?.startedAt).toBe(T2);
    expect(next.updatedAt).toBe(T2);
    expect(initial.lessons[KEY]).toBeUndefined();
    expect(next).not.toBe(initial);
  });

  it("returns the same state when the lesson is already started", () => {
    const started = deepFreeze(markStarted(frozenEmpty(), KEY, T1));
    expect(markStarted(started, KEY, T2)).toBe(started);
  });
});

describe("markCompleted and unmarkCompleted", () => {
  it("sets completedAt and a startedAt if the lesson was never opened", () => {
    const next = markCompleted(frozenEmpty(), KEY, T2);
    expect(next.lessons[KEY]).toEqual({ startedAt: T2, completedAt: T2 });
  });

  it("keeps the original startedAt when completing", () => {
    const started = deepFreeze(markStarted(frozenEmpty(), KEY, T1));
    const done = markCompleted(started, KEY, T2);
    expect(done.lessons[KEY]).toEqual({ startedAt: T1, completedAt: T2 });
  });

  it("removes completedAt but keeps the rest of the record", () => {
    const done = deepFreeze(markCompleted(frozenEmpty(), KEY, T2));
    const undone = unmarkCompleted(done, KEY, T3);
    expect(undone.lessons[KEY]).toEqual({ startedAt: T2 });
    expect(undone.updatedAt).toBe(T3);
    expect(done.lessons[KEY]?.completedAt).toBe(T2);
  });

  it("is a no-op on a lesson that was not completed", () => {
    const initial = frozenEmpty();
    expect(unmarkCompleted(initial, KEY, T2)).toBe(initial);
  });
});

describe("recordQuiz and markPractice", () => {
  it("stores the quiz attempt", () => {
    const quiz = { version: 1, score: 5, total: 6, passed: true, at: T2 };
    const next = recordQuiz(frozenEmpty(), KEY, quiz);
    expect(next.lessons[KEY]?.quiz).toEqual(quiz);
    expect(next.updatedAt).toBe(T2);
  });

  it("stores practiceDoneAt", () => {
    const next = markPractice(frozenEmpty(), KEY, T2);
    expect(next.lessons[KEY]?.practiceDoneAt).toBe(T2);
  });
});

describe("mergeProgress", () => {
  it("takes the later timestamp per field and the later quiz attempt", () => {
    const a = deepFreeze({
      ...emptyProgress(T2),
      lessons: {
        [KEY]: {
          startedAt: T1,
          completedAt: T3,
          quiz: { version: 1, score: 2, total: 6, passed: false, at: T1 },
        },
        "cc-zero.tool-use": { startedAt: T2 },
      },
    });
    const b = deepFreeze({
      ...emptyProgress(T3),
      lessons: {
        [KEY]: {
          startedAt: T2,
          completedAt: T2,
          quiz: { version: 1, score: 6, total: 6, passed: true, at: T2 },
          practiceDoneAt: T2,
        },
        "cc-zero.hooks": { completedAt: T1 },
      },
    });
    const merged = mergeProgress(a, b);
    expect(merged.lessons[KEY]).toEqual({
      startedAt: T2,
      completedAt: T3,
      quiz: { version: 1, score: 6, total: 6, passed: true, at: T2 },
      practiceDoneAt: T2,
    });
    expect(merged.lessons["cc-zero.tool-use"]).toEqual({ startedAt: T2 });
    expect(merged.lessons["cc-zero.hooks"]).toEqual({ completedAt: T1 });
    expect(merged.updatedAt).toBe(T3);
    expect(merged.schemaVersion).toBe(1);
  });

  it("does not mutate either input", () => {
    const a = deepFreeze(markCompleted(emptyProgress(T1), KEY, T1));
    const b = deepFreeze(markStarted(emptyProgress(T2), "cc-zero.tool-use", T2));
    expect(() => mergeProgress(a, b)).not.toThrow();
    expect(Object.keys(a.lessons)).toEqual([KEY]);
    expect(Object.keys(b.lessons)).toEqual(["cc-zero.tool-use"]);
  });
});

describe("resetProgress", () => {
  it("returns an empty state stamped with the given time", () => {
    const reset = resetProgress(T3);
    expect(reset).toEqual({ schemaVersion: 1, updatedAt: T3, lessons: {} });
  });
});
