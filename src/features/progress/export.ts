import type { ProgressState } from "./schema";

export const EXPORT_FORMAT = "learn-progress";
export const EXPORT_VERSION = 1;

export type ProgressExport = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  data: ProgressState;
};

export type ExportResult = { ok: true } | { ok: false; reason: "download-failed" };

const DATE_LENGTH = "YYYY-MM-DD".length;
const JSON_INDENT = 2;

export function exportFileName(now: Date): string {
  return `learn-progress-${now.toISOString().slice(0, DATE_LENGTH)}.json`;
}

export function buildExport(
  state: ProgressState,
  now: Date = new Date(),
): ProgressExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    data: state,
  };
}

export function serializeExport(state: ProgressState, now: Date = new Date()): string {
  return JSON.stringify(buildExport(state, now), null, JSON_INDENT);
}

/** Offers the export as a file download; failures come back as a value. */
export function downloadProgress(
  state: ProgressState,
  now: Date = new Date(),
): ExportResult {
  try {
    const blob = new Blob([serializeExport(state, now)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFileName(now);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch {
    return { ok: false, reason: "download-failed" };
  }
}
