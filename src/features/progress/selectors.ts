import type { ProgressState } from "./schema";

export type LessonStatus = "new" | "started" | "completed";

export type TrackSummary = { done: number; total: number; percent: number };

const PERCENT = 100;

export function lessonStatus(state: ProgressState, key: string): LessonStatus {
  const lesson = state.lessons[key];
  if (lesson?.completedAt) return "completed";
  if (lesson?.startedAt) return "started";
  return "new";
}

export function trackSummary(
  state: ProgressState,
  keys: readonly string[],
): TrackSummary {
  const total = keys.length;
  const done = keys.filter((key) => lessonStatus(state, key) === "completed").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * PERCENT);
  return { done, total, percent };
}

/** Index of the first lesson not yet completed, or null when the track is done. */
export function nextLessonIndex(
  state: ProgressState,
  orderedKeys: readonly string[],
): number | null {
  const index = orderedKeys.findIndex((key) => lessonStatus(state, key) !== "completed");
  return index === -1 ? null : index;
}
