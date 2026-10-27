"use client";

import { useSyncExternalStore } from "react";
import * as reducers from "./reducers";
import { EMPTY_PROGRESS, type ProgressState, type QuizResult } from "./schema";
import {
  createProgressStorage,
  detectLocalStorage,
  STORAGE_KEY,
  type ProgressStorage,
  type WriteResult,
} from "./storage";

/*
 * One store per page. The in-memory copy is the source of truth for React;
 * localStorage is written through on every change and re-read when another
 * tab changes it (the `storage` event never fires in the tab that wrote).
 */

const CHANGE_EVENT = "learn:progress-change";

let storage: ProgressStorage | null = null;
let cached: ProgressState | null = null;
let lastWrite: WriteResult = { ok: true };

function getStorage(): ProgressStorage {
  if (!storage) {
    storage = createProgressStorage(detectLocalStorage());
    ensureStorageListener();
  }
  return storage;
}

export function getProgressSnapshot(): ProgressState {
  if (!cached) cached = getStorage().read();
  return cached;
}

export function getProgressServerSnapshot(): ProgressState {
  return EMPTY_PROGRESS;
}

export function getIsPersistent(): boolean {
  return getStorage().isPersistent;
}

function notify(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

let isListeningToStorage = false;

/** Another tab (or a test) changed localStorage: drop the cache and wake subscribers. */
function onStorageEvent(event: StorageEvent): void {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  cached = null;
  notify();
}

/** Registered once per page, independent of mounted components, so the cache never goes stale. */
function ensureStorageListener(): void {
  if (isListeningToStorage || typeof window === "undefined") return;
  window.addEventListener("storage", onStorageEvent);
  isListeningToStorage = true;
}

export function subscribeProgress(callback: () => void): () => void {
  ensureStorageListener();
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

/** Applies a reducer, persists the result and wakes subscribers; skips no-ops. */
function commit(next: ProgressState): void {
  if (next === cached) return;
  cached = next;
  lastWrite = getStorage().write(next);
  notify();
}

export const progressActions = {
  markStarted(key: string): void {
    commit(reducers.markStarted(getProgressSnapshot(), key));
  },
  markCompleted(key: string): void {
    commit(reducers.markCompleted(getProgressSnapshot(), key));
  },
  unmarkCompleted(key: string): void {
    commit(reducers.unmarkCompleted(getProgressSnapshot(), key));
  },
  recordQuiz(key: string, quiz: QuizResult): void {
    commit(reducers.recordQuiz(getProgressSnapshot(), key, quiz));
  },
  markPractice(key: string): void {
    commit(reducers.markPractice(getProgressSnapshot(), key));
  },
  /** Merges an imported state in and returns how many lessons it carried. */
  importProgress(incoming: ProgressState): number {
    commit(reducers.mergeProgress(getProgressSnapshot(), incoming));
    return Object.keys(incoming.lessons).length;
  },
  resetProgress(): void {
    getStorage().clear();
    commit(reducers.resetProgress());
  },
  /** Result of the most recent write, for surfacing quota problems. */
  lastWriteResult(): WriteResult {
    return lastWrite;
  },
} as const;

export type ProgressActions = typeof progressActions;

export function useProgress(): {
  state: ProgressState;
  isPersistent: boolean;
} & ProgressActions {
  const state = useSyncExternalStore(
    subscribeProgress,
    getProgressSnapshot,
    getProgressServerSnapshot,
  );
  const isPersistent = useSyncExternalStore(
    subscribeProgress,
    getIsPersistent,
    () => true,
  );
  return { state, isPersistent, ...progressActions };
}
