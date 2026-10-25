import { createTwoFilesPatch } from "diff";
import { formatChangeTable, type Comparison } from "./compare";

export interface FileDiff {
  path: string;
  before: string;
  after: string;
}

export interface ApplySummary {
  written: readonly string[];
  proposed: readonly string[];
  conflicts: readonly string[];
  warnings: readonly string[];
}

export interface ReportInput {
  date: Date;
  sourceId: string;
  commit: string;
  mode: "check" | "apply";
  comparison: Comparison;
  diffs: readonly FileDiff[];
  apply?: ApplySummary;
}

export function unifiedDiff(diff: FileDiff): string {
  return createTwoFilesPatch(`locked/${diff.path}`, `upstream/${diff.path}`, diff.before, diff.after);
}

function listSection(title: string, items: readonly string[]): string[] {
  if (items.length === 0) return [];
  return [`### ${title}`, "", ...items.map((item) => `- ${item}`), ""];
}

function applySection(apply: ApplySummary | undefined): string[] {
  if (!apply) return [];
  return [
    "## Apply",
    "",
    ...listSection("Written", apply.written),
    ...listSection("Proposed (needs review)", apply.proposed),
    ...listSection("Conflicts", apply.conflicts),
    ...listSection("Warnings", apply.warnings),
  ];
}

function diffSection(diffs: readonly FileDiff[]): string[] {
  if (diffs.length === 0) return [];
  return ["## Diffs", "", ...diffs.flatMap((d) => [`### ${d.path}`, "", "```diff", unifiedDiff(d).trimEnd(), "```", ""])];
}

/** Markdown report for `content/reports/import-<date>.md`. */
export function buildReport(input: ReportInput): string {
  const { counts } = input.comparison;
  const summary = `NEW ${counts.NEW}, CHANGED ${counts.CHANGED}, REMOVED ${counts.REMOVED}, UNCHANGED ${counts.UNCHANGED}`;
  return [
    `# Content import ${input.date.toISOString().slice(0, 10)}`,
    "",
    `- Source: \`${input.sourceId}\``,
    `- Commit: \`${input.commit}\``,
    `- Mode: ${input.mode}`,
    `- Summary: ${summary}`,
    "",
    "## Files",
    "",
    formatChangeTable(input.comparison),
    "",
    ...diffSection(input.diffs),
    ...applySection(input.apply),
  ].join("\n").trimEnd().concat("\n");
}
