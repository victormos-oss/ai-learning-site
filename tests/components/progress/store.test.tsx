import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyProgress } from "@/features/progress/schema";
import { markCompleted } from "@/features/progress/reducers";
import { STORAGE_KEY } from "@/features/progress/storage";
import { useProgress } from "@/features/progress/store";
import { readStoredProgress, resetStoredProgress } from "./helpers";

const T = "2026-10-01T10:00:00.000Z";
const KEY = "cc-zero.agent-loop";

describe("useProgress", () => {
  beforeEach(() => {
    resetStoredProgress();
  });

  it("starts empty, persists actions and reports persistent storage", () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.state.lessons).toEqual({});
    expect(result.current.isPersistent).toBe(true);

    act(() => {
      result.current.markCompleted(KEY);
    });
    expect(result.current.state.lessons[KEY]?.completedAt).toBeTruthy();
    expect(readStoredProgress()).toEqual(result.current.state);
  });

  it("picks up changes written by another tab", () => {
    const { result } = renderHook(() => useProgress());
    const fromOtherTab = markCompleted(emptyProgress(T), KEY, T);

    act(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fromOtherTab));
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    expect(result.current.state).toEqual(fromOtherTab);
  });

  it("merges imported progress and returns the imported lesson count", () => {
    const { result } = renderHook(() => useProgress());
    act(() => {
      result.current.markCompleted("cc-zero.tool-use");
    });
    const incoming = markCompleted(emptyProgress(T), KEY, T);

    let count = 0;
    act(() => {
      count = result.current.importProgress(incoming);
    });
    expect(count).toBe(1);
    expect(Object.keys(result.current.state.lessons).sort()).toEqual([
      KEY,
      "cc-zero.tool-use",
    ]);

    act(() => {
      result.current.resetProgress();
    });
    expect(result.current.state.lessons).toEqual({});
  });
});
