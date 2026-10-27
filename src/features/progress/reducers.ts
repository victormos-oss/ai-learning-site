import {
  emptyProgress,
  nowIso,
  type LessonProgress,
  type ProgressState,
  type QuizResult,
} from "./schema";

/*
 * Pure reducers. Every function returns a new state and never touches its
 * input; a reducer that changes nothing returns the same reference so the
 * store can skip the write.
 */

function withLesson(
  state: ProgressState,
  key: string,
  lesson: LessonProgress,
  at: string,
): ProgressState {
  return {
    ...state,
    updatedAt: at,
    lessons: { ...state.lessons, [key]: lesson },
  };
}

export function markStarted(
  state: ProgressState,
  key: string,
  at: string = nowIso(),
): ProgressState {
  const current = state.lessons[key];
  if (current?.startedAt) return state;
  return withLesson(state, key, { ...current, startedAt: at }, at);
}

export function markCompleted(
  state: ProgressState,
  key: string,
  at: string = nowIso(),
): ProgressState {
  const current = state.lessons[key] ?? {};
  const lesson: LessonProgress = {
    ...current,
    startedAt: current.startedAt ?? at,
    completedAt: at,
  };
  return withLesson(state, key, lesson, at);
}

export function unmarkCompleted(
  state: ProgressState,
  key: string,
  at: string = nowIso(),
): ProgressState {
  const current = state.lessons[key];
  if (!current?.completedAt) return state;
  const rest = Object.fromEntries(
    Object.entries(current).filter(([field]) => field !== "completedAt"),
  ) as LessonProgress;
  return withLesson(state, key, rest, at);
}

export function recordQuiz(
  state: ProgressState,
  key: string,
  quiz: QuizResult,
): ProgressState {
  const current = state.lessons[key] ?? {};
  return withLesson(state, key, { ...current, quiz }, quiz.at);
}

export function markPractice(
  state: ProgressState,
  key: string,
  at: string = nowIso(),
): ProgressState {
  const current = state.lessons[key] ?? {};
  return withLesson(state, key, { ...current, practiceDoneAt: at }, at);
}

export function resetProgress(at: string = nowIso()): ProgressState {
  return emptyProgress(at);
}

/** ISO 8601 strings in UTC compare correctly as plain strings. */
function later(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a >= b ? a : b;
}

function laterQuiz(
  a: QuizResult | undefined,
  b: QuizResult | undefined,
): QuizResult | undefined {
  if (!a) return b;
  if (!b) return a;
  return a.at >= b.at ? a : b;
}

function mergeLesson(a: LessonProgress = {}, b: LessonProgress = {}): LessonProgress {
  const startedAt = later(a.startedAt, b.startedAt);
  const completedAt = later(a.completedAt, b.completedAt);
  const practiceDoneAt = later(a.practiceDoneAt, b.practiceDoneAt);
  const quiz = laterQuiz(a.quiz, b.quiz);
  return {
    ...(startedAt && { startedAt }),
    ...(completedAt && { completedAt }),
    ...(quiz && { quiz }),
    ...(practiceDoneAt && { practiceDoneAt }),
  };
}

/** Field-by-field union of two states, keeping the later mark on each field. */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const keys = new Set([...Object.keys(a.lessons), ...Object.keys(b.lessons)]);
  const lessons = Object.fromEntries(
    [...keys].map((key) => [key, mergeLesson(a.lessons[key], b.lessons[key])]),
  );
  return {
    schemaVersion: a.schemaVersion,
    updatedAt: later(a.updatedAt, b.updatedAt) ?? a.updatedAt,
    lessons,
  };
}
