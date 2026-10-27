import { describe, expect, it } from "vitest";
import { emptyProgress } from "@/features/progress/schema";
import { markCompleted, markStarted } from "@/features/progress/reducers";
import {
  buildExport,
  EXPORT_FORMAT,
  exportFileName,
  serializeExport,
} from "@/features/progress/export";
import {
  MAX_IMPORT_BYTES,
  parseProgressExport,
  readProgressFile,
} from "@/features/progress/import";

const T = "2026-10-01T10:00:00.000Z";
const NOW = new Date("2026-10-26T12:34:56.000Z");

function sampleState() {
  const started = markStarted(emptyProgress(T), "cc-zero.tool-use", T);
  return markCompleted(started, "cc-zero.agent-loop", T);
}

describe("export", () => {
  it("names the file by date", () => {
    expect(exportFileName(NOW)).toBe("learn-progress-2026-10-26.json");
  });

  it("wraps the state in the export envelope", () => {
    const envelope = buildExport(sampleState(), NOW);
    expect(envelope).toEqual({
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: NOW.toISOString(),
      data: sampleState(),
    });
  });
});

describe("parseProgressExport", () => {
  it("round-trips a serialized export", () => {
    const text = serializeExport(sampleState(), NOW);
    const result = parseProgressExport(text);
    expect(result).toEqual({ ok: true, state: sampleState() });
  });

  it("rejects files larger than the limit", () => {
    const padding = "x".repeat(MAX_IMPORT_BYTES + 1);
    expect(parseProgressExport(padding)).toEqual({ ok: false, reason: "too-large" });
  });

  it("rejects text that is not JSON", () => {
    expect(parseProgressExport("{nope")).toEqual({ ok: false, reason: "not-json" });
  });

  it("rejects a foreign format", () => {
    const foreign = JSON.stringify({ format: "other-app", version: 1, data: {} });
    expect(parseProgressExport(foreign)).toEqual({ ok: false, reason: "wrong-format" });
  });

  it("rejects an unsupported export version", () => {
    const future = JSON.stringify({
      format: EXPORT_FORMAT,
      version: 2,
      exportedAt: T,
      data: emptyProgress(T),
    });
    expect(parseProgressExport(future)).toEqual({
      ok: false,
      reason: "unsupported-version",
    });
  });

  it("rejects an envelope whose data fails the schema", () => {
    const broken = JSON.stringify({
      format: EXPORT_FORMAT,
      version: 1,
      exportedAt: T,
      data: { schemaVersion: 1, updatedAt: T, lessons: { bad: { completedAt: 1 } } },
    });
    expect(parseProgressExport(broken)).toEqual({ ok: false, reason: "invalid-data" });
  });
});

describe("readProgressFile", () => {
  it("reads and parses a File", async () => {
    const file = new File([serializeExport(sampleState(), NOW)], "p.json", {
      type: "application/json",
    });
    await expect(readProgressFile(file)).resolves.toEqual({
      ok: true,
      state: sampleState(),
    });
  });

  it("refuses an oversized file before reading it", async () => {
    const file = new File(["x".repeat(MAX_IMPORT_BYTES + 1)], "big.json");
    await expect(readProgressFile(file)).resolves.toEqual({
      ok: false,
      reason: "too-large",
    });
  });

  it("returns read-failed when the file cannot be read", async () => {
    const broken = { size: 10, text: () => Promise.reject(new Error("io")) };
    await expect(readProgressFile(broken as unknown as File)).resolves.toEqual({
      ok: false,
      reason: "read-failed",
    });
  });
});
