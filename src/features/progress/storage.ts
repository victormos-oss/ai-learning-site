import { migrateProgress } from "./migrations";
import { emptyProgress, type ProgressState } from "./schema";

export const STORAGE_KEY = "learn.vdmitriev.progress";
/** Unreadable data is parked here instead of being deleted. */
export const BACKUP_KEY = "learn.vdmitriev.progress.backup";

/** The subset of the Web Storage API this module relies on. */
export type StorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type WriteFailure = "quota" | "unavailable";
export type WriteResult = { ok: true } | { ok: false; reason: WriteFailure };

export type ProgressStorage = {
  /** False when progress lives only in memory for this page. */
  readonly isPersistent: boolean;
  read(): ProgressState;
  write(state: ProgressState): WriteResult;
  clear(): void;
};

const QUOTA_ERROR_NAMES = new Set(["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"]);
const QUOTA_ERROR_CODE = 22;

function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (QUOTA_ERROR_NAMES.has(error.name)) return true;
  return (error as { code?: number }).code === QUOTA_ERROR_CODE;
}

class MemoryBackend implements StorageBackend {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

/** Returns window.localStorage only when it can actually be used. */
export function detectLocalStorage(): StorageBackend | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = `${STORAGE_KEY}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

function backupRaw(backend: StorageBackend, raw: string): void {
  try {
    backend.setItem(BACKUP_KEY, raw);
    backend.removeItem(STORAGE_KEY);
  } catch {
    // The backup is best effort: losing it is better than failing to render.
  }
}

function parseStored(raw: string): ProgressState | null {
  try {
    const result = migrateProgress(JSON.parse(raw));
    return result.ok ? result.state : null;
  } catch {
    return null;
  }
}

export function createProgressStorage(backend: StorageBackend | null): ProgressStorage {
  const store = backend ?? new MemoryBackend();
  return {
    isPersistent: backend !== null,

    read(): ProgressState {
      let raw: string | null = null;
      try {
        raw = store.getItem(STORAGE_KEY);
      } catch {
        return emptyProgress();
      }
      if (raw === null) return emptyProgress();
      const parsed = parseStored(raw);
      if (parsed) return parsed;
      backupRaw(store, raw);
      return emptyProgress();
    },

    write(state: ProgressState): WriteResult {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(state));
        return { ok: true };
      } catch (error) {
        return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" };
      }
    },

    clear(): void {
      try {
        store.removeItem(STORAGE_KEY);
      } catch {
        // Nothing left to do: the in-memory state is already reset by the caller.
      }
    },
  };
}
