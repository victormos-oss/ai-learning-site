import { describe, expect, it } from "vitest";
import { emptyProgress, SCHEMA_VERSION } from "@/features/progress/schema";
import { migrateProgress } from "@/features/progress/migrations";

const T1 = "2026-10-01T10:00:00.000Z";

describe("migrateProgress", () => {
  it("accepts a current-version state as is", () => {
    const state = {
      ...emptyProgress(T1),
      lessons: { "cc-zero.agent-loop": { startedAt: T1, completedAt: T1 } },
    };
    const result = migrateProgress(state);
    expect(result).toEqual({ ok: true, state });
  });

  it("rejects input that is not an object with a numeric schemaVersion", () => {
    expect(migrateProgress(null)).toEqual({ ok: false, reason: "invalid-data" });
    expect(migrateProgress("text")).toEqual({ ok: false, reason: "invalid-data" });
    expect(migrateProgress({ lessons: {} })).toEqual({
      ok: false,
      reason: "invalid-data",
    });
  });

  it("rejects a version newer than the app knows", () => {
    const result = migrateProgress({
      schemaVersion: SCHEMA_VERSION + 1,
      updatedAt: T1,
      lessons: {},
    });
    expect(result).toEqual({ ok: false, reason: "unsupported-version" });
  });

  it("rejects an older version with no migration path", () => {
    const result = migrateProgress({ schemaVersion: 0, updatedAt: T1, lessons: {} });
    expect(result).toEqual({ ok: false, reason: "unsupported-version" });
  });

  it("rejects a current-version object with an invalid shape", () => {
    const result = migrateProgress({
      schemaVersion: SCHEMA_VERSION,
      updatedAt: "yesterday",
      lessons: { "Bad Key": { completedAt: 42 } },
    });
    expect(result).toEqual({ ok: false, reason: "invalid-data" });
  });
});
