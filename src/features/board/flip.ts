/**
 * Pure helpers for the split-flap animation. A board row flips from one
 * string to another: every cell steps through intermediate characters, cells
 * start left to right with a small stagger, and the whole row settles within
 * a bounded duration so the motion never needs a pause control (WCAG 2.2.2).
 */

export const FLAP_ALPHABET =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯÁÉÍÓÚÑÜ0123456789:·-/";

export const MAX_STEPS_PER_CELL = 6;
export const STEP_MS = 55;
export const STAGGER_MS = 28;
export const MAX_TOTAL_MS = 1500;

export type FlapCellPlan = {
  index: number;
  from: string;
  to: string;
  /** Intermediate characters shown before `to`, possibly empty. */
  steps: string[];
  delayMs: number;
};

/** Pads both strings to the same length with spaces, uppercased for the board. */
export function alignForFlip(from: string, to: string, locale?: string): [string, string] {
  const a = from.toLocaleUpperCase(locale);
  const b = to.toLocaleUpperCase(locale);
  const width = Math.max(a.length, b.length);
  return [a.padEnd(width, " "), b.padEnd(width, " ")];
}

function intermediateSteps(from: string, to: string): string[] {
  if (from === to) return [];
  const start = FLAP_ALPHABET.indexOf(from);
  const end = FLAP_ALPHABET.indexOf(to);
  if (start === -1 || end === -1) return [];
  const forward = (end - start + FLAP_ALPHABET.length) % FLAP_ALPHABET.length;
  const count = Math.min(Math.max(forward - 1, 0), MAX_STEPS_PER_CELL);
  return Array.from({ length: count }, (_, i) => {
    const offset = Math.round(((i + 1) * forward) / (count + 1));
    return FLAP_ALPHABET[(start + offset) % FLAP_ALPHABET.length] ?? to;
  });
}

/** Plans one row flip. Delays are clamped so the last cell settles within MAX_TOTAL_MS. */
export function planFlip(from: string, to: string, locale?: string): FlapCellPlan[] {
  const [a, b] = alignForFlip(from, to, locale);
  const cells = [...a].map((char, index) => ({ char, index, target: b[index] ?? " " }));
  const longest = Math.max(
    1,
    ...cells.map((c) => intermediateSteps(c.char, c.target).length + 1),
  );
  const budgetForStagger = Math.max(0, MAX_TOTAL_MS - longest * STEP_MS);
  const stagger = Math.min(STAGGER_MS, budgetForStagger / Math.max(1, cells.length - 1));
  return cells.map(({ char, index, target }) => ({
    index,
    from: char,
    to: target,
    steps: intermediateSteps(char, target),
    delayMs: Math.round(index * stagger),
  }));
}

/** Total time until the last cell shows its final character. */
export function flipDuration(plan: readonly FlapCellPlan[]): number {
  return plan.reduce(
    (max, cell) => Math.max(max, cell.delayMs + (cell.steps.length + 1) * STEP_MS),
    0,
  );
}
