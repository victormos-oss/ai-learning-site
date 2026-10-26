import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  entryDir,
  entryRelative,
  lessonDirName,
  loadMapping,
  mappingFileSchema,
  mappingProblems,
  parseMapping,
} from "../../../../scripts/content/lib/mapping-schema";
import { findSource, loadSources } from "../../../../scripts/content/lib/sources-schema";

const ROOT = process.cwd();
const sources = loadSources(join(ROOT, "content/sources/sources.yaml"));
const learnSource = findSource(sources, "learn-claude-code");

const baseMapping = {
  source: "learn-claude-code",
  track: "claude-code-zero",
  entries: [
    {
      from: "s01_agent_loop/README.md",
      key: "cc-zero.agent-loop",
      module: "02-one-agent",
      slug: "agent-loop",
      order: 1,
      code: "code.py",
      assets: ["images/*"],
      estimatedMinutes: 5,
    },
    {
      from: "s02_tool_use/README.md",
      key: "cc-zero.tool-use",
      module: "02-one-agent",
      slug: "tool-use",
      order: 2,
      estimatedMinutes: 5,
    },
  ],
};

describe("learn-claude-code mapping file", () => {
  const mapping = loadMapping(
    join(ROOT, "content/sources/mapping/learn-claude-code.yaml"),
    learnSource,
  );

  it("has 17 entries with unique keys and slugs", () => {
    expect(mapping.entries).toHaveLength(17);
    expect(new Set(mapping.entries.map((e) => e.key)).size).toBe(17);
    expect(new Set(mapping.entries.map((e) => e.slug)).size).toBe(17);
  });

  it("splits sections across modules 02, 03 and 04", () => {
    const byModule = Object.groupBy(mapping.entries, (e) => e.module);
    expect(byModule["02-one-agent"]).toHaveLength(6);
    expect(byModule["03-context-and-long-tasks"]).toHaveLength(5);
    expect(byModule["04-autonomy-and-teams"]).toHaveLength(6);
  });

  it("keeps every `from` inside the allowed source paths", () => {
    expect(mappingProblems(mapping, learnSource)).toEqual([]);
  });

  it("derives lesson folder names from order and slug", () => {
    expect(lessonDirName(mapping.entries[0]!)).toBe("01-agent-loop");
    expect(entryDir(mapping.entries[0]!)).toBe("s01_agent_loop");
    expect(entryRelative(mapping.entries[0]!, "code.py")).toBe("s01_agent_loop/code.py");
  });

  it("matches the YAML on disk entry by entry", () => {
    const raw = readFileSync(
      join(ROOT, "content/sources/mapping/learn-claude-code.yaml"),
      "utf8",
    );
    expect(raw).toContain("s17_goal_loop/README.md");
  });
});

describe("mapping schema", () => {
  it("rejects duplicate keys", () => {
    const entries = baseMapping.entries.map((e) => ({ ...e, key: "cc-zero.agent-loop" }));
    const result = mappingFileSchema.safeParse({ ...baseMapping, entries });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("duplicate key");
  });

  it("rejects duplicate slugs", () => {
    const entries = baseMapping.entries.map((e) => ({ ...e, slug: "agent-loop" }));
    const result = mappingFileSchema.safeParse({ ...baseMapping, entries });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain("duplicate slug");
  });

  it("rejects a `from` outside the include globs", () => {
    const entries = [{ ...baseMapping.entries[0]!, from: "docs/en/s01_agent_loop.md" }];
    const problems = mappingProblems(
      mappingFileSchema.parse({ ...baseMapping, entries }),
      learnSource,
    );
    // README plus code.py and images/* resolved against the new folder.
    expect(problems).toHaveLength(3);
    expect(problems[0]).toContain("docs/en/s01_agent_loop.md");
    expect(problems.every((p) => p.includes("docs/en/"))).toBe(true);
  });

  it("rejects a `from` that matches an exclude glob", () => {
    const source = { ...learnSource, include: [], exclude: ["s01_agent_loop/**"] };
    const problems = mappingProblems(mappingFileSchema.parse(baseMapping), source);
    expect(problems.some((p) => p.includes("s01_agent_loop/README.md"))).toBe(true);
  });

  it.each([
    "../x/README.md",
    "/abs/README.md",
    "C:/x/README.md",
    "a\\b/README.md",
    "s01/../../x.md",
  ])("rejects traversal or non-posix path %s", (from) => {
    const entries = [{ ...baseMapping.entries[0]!, from }];
    expect(mappingFileSchema.safeParse({ ...baseMapping, entries }).success).toBe(false);
  });

  it("refuses a source with use: link", () => {
    const linkSource = findSource(sources, "awesome-claude-code");
    const yaml = [
      "source: awesome-claude-code",
      "track: claude-code-zero",
      "entries:",
      "  - from: README.md",
      "    key: cc-zero.awesome",
      "    module: 02-one-agent",
      "    slug: awesome",
      "    order: 9",
      "    estimatedMinutes: 5",
    ].join("\n");
    expect(() => parseMapping(yaml, linkSource)).toThrow(/use: link/);
  });

  it("refuses a mapping whose source id differs from the registry entry", () => {
    const problems = mappingProblems(mappingFileSchema.parse(baseMapping), {
      ...learnSource,
      id: "other",
    });
    expect(problems[0]).toMatch(/mapping is for/);
  });
});
