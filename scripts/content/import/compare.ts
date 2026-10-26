export type ChangeStatus = "NEW" | "CHANGED" | "REMOVED" | "UNCHANGED";

export interface FileChange {
  path: string;
  status: ChangeStatus;
  before?: string;
  after?: string;
}

export interface Comparison {
  changes: FileChange[];
  counts: Record<ChangeStatus, number>;
  hasChanges: boolean;
}

export type HashMap = Readonly<Record<string, string>>;

function statusFor(before: string | undefined, after: string | undefined): ChangeStatus {
  if (before === undefined) return "NEW";
  if (after === undefined) return "REMOVED";
  return before === after ? "UNCHANGED" : "CHANGED";
}

const EMPTY_COUNTS: Record<ChangeStatus, number> = {
  NEW: 0,
  CHANGED: 0,
  REMOVED: 0,
  UNCHANGED: 0,
};

/** Pure comparison of current file hashes against the locked ones. */
export function compareHashes(current: HashMap, locked: HashMap): Comparison {
  const paths = [...new Set([...Object.keys(current), ...Object.keys(locked)])].sort();
  const changes = paths.map((path): FileChange => ({
    path,
    status: statusFor(locked[path], current[path]),
    ...(locked[path] !== undefined ? { before: locked[path] } : {}),
    ...(current[path] !== undefined ? { after: current[path] } : {}),
  }));
  const counts = changes.reduce(
    (acc, change) => ({ ...acc, [change.status]: acc[change.status] + 1 }),
    EMPTY_COUNTS,
  );
  return { changes, counts, hasChanges: changes.some((c) => c.status !== "UNCHANGED") };
}

/** Fixed-width table for the terminal and the markdown report. */
export function formatChangeTable(comparison: Comparison): string {
  const width = Math.max(4, ...comparison.changes.map((c) => c.path.length));
  const rows = comparison.changes.map(
    (c) => `| ${c.status.padEnd(9)} | ${c.path.padEnd(width)} |`,
  );
  const header = `| ${"status".padEnd(9)} | ${"path".padEnd(width)} |`;
  const rule = `| ${"-".repeat(9)} | ${"-".repeat(width)} |`;
  return [header, rule, ...rows].join("\n");
}
