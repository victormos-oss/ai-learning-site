import { describe, expect, it } from "vitest";
import {
  MAX_STEPS_PER_CELL,
  MAX_TOTAL_MS,
  alignForFlip,
  flipDuration,
  planFlip,
} from "@/features/board/flip";

describe("alignForFlip", () => {
  it("uppercases and pads to a common width", () => {
    expect(alignForFlip("ru", "English")).toEqual(["RU     ", "ENGLISH"]);
  });

  it("uses locale-aware uppercasing", () => {
    expect(alignForFlip("цикл", "x", "ru")[0]).toBe("ЦИКЛ");
  });
});

describe("planFlip", () => {
  it("keeps cells that do not change still", () => {
    const plan = planFlip("AB", "AC");
    expect(plan[0]?.steps).toEqual([]);
    expect(plan[1]?.steps.length).toBeGreaterThan(0);
  });

  it("caps the intermediate steps per cell", () => {
    const plan = planFlip("A", "9");
    expect(plan[0]?.steps.length).toBeLessThanOrEqual(MAX_STEPS_PER_CELL);
  });

  it("staggers delays left to right and ends within the budget", () => {
    const plan = planFlip("Установка Claude Code", "Instalación de Claude Code", "ru");
    const delays = plan.map((c) => c.delayMs);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(flipDuration(plan)).toBeLessThanOrEqual(MAX_TOTAL_MS);
  });

  it("handles characters outside the alphabet by jumping straight to the target", () => {
    const plan = planFlip("%", "A");
    expect(plan[0]?.steps).toEqual([]);
    expect(plan[0]?.to).toBe("A");
  });
});
