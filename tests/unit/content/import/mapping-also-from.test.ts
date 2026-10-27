import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  entryFiles,
  loadMapping,
  mappingFileSchema,
  mappingProblems,
} from "../../../../scripts/content/lib/mapping-schema";
import { findSource, loadSources } from "../../../../scripts/content/lib/sources-schema";

const ROOT = process.cwd();
const sources = loadSources(join(ROOT, "content/sources/sources.yaml"));
const usmanSource = findSource(sources, "cc-best-practices-usman");

const baseEntry = {
  from: "guides/context-management.md",
  key: "cc-zero.context-and-cost",
  module: "01-getting-started",
  slug: "context-and-cost",
  order: 6,
  estimatedMinutes: 20,
};

const mapping = (entry: Record<string, unknown>) => ({
  source: "cc-best-practices-usman",
  track: "claude-code-zero",
  entries: [entry],
});

describe("mapping entry: alsoFrom and type", () => {
  it("defaults alsoFrom to [] and type to learn", () => {
    const parsed = mappingFileSchema.parse(mapping(baseEntry));
    expect(parsed.entries[0]?.alsoFrom).toEqual([]);
    expect(parsed.entries[0]?.type).toBe("learn");
  });

  it("accepts extra files and a lesson type", () => {
    const parsed = mappingFileSchema.parse(
      mapping({
        ...baseEntry,
        alsoFrom: ["guides/cost-management.md", "guides/common-mistakes.md"],
        type: "build",
      }),
    );
    expect(parsed.entries[0]?.alsoFrom).toHaveLength(2);
    expect(parsed.entries[0]?.type).toBe("build");
  });

  it("rejects an unknown type", () => {
    expect(mappingFileSchema.safeParse(mapping({ ...baseEntry, type: "video" })).success).toBe(
      false,
    );
  });

  it("rejects alsoFrom that repeats `from` or itself", () => {
    const same = mappingFileSchema.safeParse(
      mapping({ ...baseEntry, alsoFrom: ["guides/context-management.md"] }),
    );
    expect(same.success).toBe(false);
    expect(JSON.stringify(same.error?.issues)).toContain("alsoFrom");
    const twice = mappingFileSchema.safeParse(
      mapping({ ...baseEntry, alsoFrom: ["guides/a.md", "guides/a.md"] }),
    );
    expect(twice.success).toBe(false);
  });

  it.each(["../x.md", "/abs.md", "a\\b.md", "guides/../../x.md"])(
    "rejects traversal in alsoFrom %s",
    (path) => {
      expect(
        mappingFileSchema.safeParse(mapping({ ...baseEntry, alsoFrom: [path] })).success,
      ).toBe(false);
    },
  );

  it("checks alsoFrom against the include/exclude rules of the source", () => {
    const parsed = mappingFileSchema.parse(
      mapping({ ...baseEntry, alsoFrom: ["tools/quickstart-prompt.md"] }),
    );
    const problems = mappingProblems(parsed, usmanSource);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("tools/quickstart-prompt.md");
  });

  it("lists every upstream file of an entry: from first, then alsoFrom", () => {
    const parsed = mappingFileSchema.parse(
      mapping({ ...baseEntry, alsoFrom: ["guides/cost-management.md"] }),
    );
    expect(entryFiles(parsed.entries[0]!)).toEqual([
      "guides/context-management.md",
      "guides/cost-management.md",
    ]);
  });
});

describe("cc-best-practices-usman mapping file", () => {
  const loaded = loadMapping(
    join(ROOT, "content/sources/mapping/cc-best-practices-usman.yaml"),
    usmanSource,
  );

  it("maps five imported lessons of module 01 with orders 1, 2, 3, 4 and 6", () => {
    expect(loaded.entries.map((e) => e.module)).toEqual(
      Array<string>(5).fill("01-getting-started"),
    );
    expect(loaded.entries.map((e) => e.order)).toEqual([1, 2, 3, 4, 6]);
    expect(loaded.entries.map((e) => e.slug)).toEqual([
      "install",
      "first-task",
      "claude-md",
      "permission-modes",
      "context-and-cost",
    ]);
  });

  it("keeps every file inside the allowed source paths", () => {
    expect(mappingProblems(loaded, usmanSource)).toEqual([]);
  });

  it("stacks cost and common mistakes onto the context lesson", () => {
    const last = loaded.entries.at(-1)!;
    expect(last.from).toBe("guides/context-management.md");
    expect(last.alsoFrom).toEqual([
      "guides/cost-management.md",
      "guides/common-mistakes.md",
    ]);
  });
});
