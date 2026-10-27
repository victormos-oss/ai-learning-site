import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/features/progress/schema";
import { markCompleted } from "@/features/progress/reducers";
import {
  BACKUP_KEY,
  createProgressStorage,
  STORAGE_KEY,
  type StorageBackend,
} from "@/features/progress/storage";

const T = "2026-10-01T10:00:00.000Z";

class FakeBackend implements StorageBackend {
  items = new Map<string, string>();
  failWith: Error | null = null;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWith) throw this.failWith;
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe("createProgressStorage", () => {
  it("reads an empty state when nothing is stored", () => {
    const storage = createProgressStorage(new FakeBackend());
    expect(storage.read().lessons).toEqual({});
    expect(storage.isPersistent).toBe(true);
  });

  it("round-trips a state", () => {
    const backend = new FakeBackend();
    const storage = createProgressStorage(backend);
    const state = markCompleted(emptyProgress(T), "cc-zero.agent-loop", T);
    expect(storage.write(state)).toEqual({ ok: true });
    expect(storage.read()).toEqual(state);
    expect(backend.items.has(STORAGE_KEY)).toBe(true);
  });

  it("moves broken JSON to the backup key and returns an empty state", () => {
    const backend = new FakeBackend();
    backend.items.set(STORAGE_KEY, "{not json");
    const storage = createProgressStorage(backend);
    expect(storage.read().lessons).toEqual({});
    expect(backend.items.get(BACKUP_KEY)).toBe("{not json");
    expect(backend.items.has(STORAGE_KEY)).toBe(false);
  });

  it("backs up valid JSON that fails the schema", () => {
    const backend = new FakeBackend();
    const raw = JSON.stringify({ schemaVersion: 99, lessons: {} });
    backend.items.set(STORAGE_KEY, raw);
    const storage = createProgressStorage(backend);
    expect(storage.read().lessons).toEqual({});
    expect(backend.items.get(BACKUP_KEY)).toBe(raw);
  });

  it("reports a quota error as a value", () => {
    const backend = new FakeBackend();
    const quota = new Error("full");
    quota.name = "QuotaExceededError";
    backend.failWith = quota;
    const storage = createProgressStorage(backend);
    expect(storage.write(emptyProgress(T))).toEqual({ ok: false, reason: "quota" });
  });

  it("reports other write failures as unavailable", () => {
    const backend = new FakeBackend();
    backend.failWith = new Error("sandboxed");
    const storage = createProgressStorage(backend);
    expect(storage.write(emptyProgress(T))).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });

  it("falls back to memory when no backend is available", () => {
    const storage = createProgressStorage(null);
    expect(storage.isPersistent).toBe(false);
    const state = markCompleted(emptyProgress(T), "cc-zero.agent-loop", T);
    expect(storage.write(state)).toEqual({ ok: true });
    expect(storage.read()).toEqual(state);
  });

  it("clears the stored value", () => {
    const backend = new FakeBackend();
    const storage = createProgressStorage(backend);
    storage.write(emptyProgress(T));
    storage.clear();
    expect(backend.items.has(STORAGE_KEY)).toBe(false);
  });
});
