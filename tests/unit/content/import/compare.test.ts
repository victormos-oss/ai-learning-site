import { describe, expect, it } from "vitest";
import {
  expandGlob,
  globToRegExp,
  matchesGlob,
  staticPrefix,
} from "../../../../scripts/content/lib/glob";
import {
  compareHashes,
  formatChangeTable,
} from "../../../../scripts/content/import/compare";
import { resolveCloneDir } from "../../../../scripts/content/import/fetch-source";
import {
  hashContent,
  normalizeNewlines,
  sha256,
} from "../../../../scripts/content/import/hash";
import { EMPTY_LOCK, mergeLock } from "../../../../scripts/content/import/lock";

const h = (text: string) => sha256(text);

describe("compareHashes", () => {
  it("classifies NEW, CHANGED, REMOVED and UNCHANGED", () => {
    const result = compareHashes(
      { "a.md": h("a"), "b.md": h("b2"), "c.md": h("c") },
      { "b.md": h("b1"), "c.md": h("c"), "d.md": h("d") },
    );
    expect(result.changes.map((c) => [c.path, c.status])).toEqual([
      ["a.md", "NEW"],
      ["b.md", "CHANGED"],
      ["c.md", "UNCHANGED"],
      ["d.md", "REMOVED"],
    ]);
    expect(result.counts).toEqual({ NEW: 1, CHANGED: 1, REMOVED: 1, UNCHANGED: 1 });
    expect(result.hasChanges).toBe(true);
  });

  it("reports no changes for identical maps and does not mutate inputs", () => {
    const current = { "a.md": h("a") };
    const frozen = Object.freeze({ ...current });
    const result = compareHashes(frozen, frozen);
    expect(result.hasChanges).toBe(false);
    expect(formatChangeTable(result)).toContain("UNCHANGED");
  });
});

describe("hash", () => {
  it("normalizes CRLF for text files only", () => {
    expect(normalizeNewlines("a\r\nb")).toBe("a\nb");
    expect(hashContent(Buffer.from("a\r\nb"), "x.md")).toBe(
      hashContent(Buffer.from("a\nb"), "x.md"),
    );
    expect(hashContent(Buffer.from("a\r\nb"), "x.png")).not.toBe(
      hashContent(Buffer.from("a\nb"), "x.png"),
    );
    expect(h("x")).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

describe("mergeLock", () => {
  it("replaces processed files, drops removed ones and keeps the rest", () => {
    const base = mergeLock(EMPTY_LOCK, {
      sourceId: "s",
      commit: "abcdef1",
      updatedAt: "2026-10-25T00:00:00.000Z",
      files: { "z.md": h("z"), "a.md": h("a"), "gone.md": h("g") },
      removed: [],
    });
    const next = mergeLock(base, {
      sourceId: "s",
      commit: "abcdef2",
      updatedAt: "2026-10-26T00:00:00.000Z",
      files: { "a.md": h("a2") },
      removed: ["gone.md"],
    });
    expect(Object.keys(next.sources.s!.files)).toEqual(["a.md", "z.md"]);
    expect(next.sources.s!.files["a.md"]).toBe(h("a2"));
    expect(next.sources.s!.commit).toBe("abcdef2");
    expect(base.sources.s!.files["gone.md"]).toBe(h("g"));
  });
});

describe("glob", () => {
  it("matches the sources.yaml patterns", () => {
    expect(matchesGlob("s01_agent_loop/README.md", "s[0-9][0-9]_*/README.md")).toBe(true);
    expect(matchesGlob("s01_agent_loop/images/x.en.svg", "s[0-9][0-9]_*/images/*")).toBe(
      true,
    );
    expect(matchesGlob("docs/en/s01.md", "docs/**")).toBe(true);
    expect(matchesGlob("s01_agent_loop/README.md", "docs/**")).toBe(false);
    expect(matchesGlob("a/b/c.md", "**/c.md")).toBe(true);
    expect(globToRegExp("a.b").test("axb")).toBe(false);
    expect(staticPrefix("s01_agent_loop/images/*")).toBe("s01_agent_loop/images");
  });

  it("expands a glob under a root and returns [] for a missing folder", () => {
    const found = expandGlob(
      process.cwd(),
      "tests/fixtures/upstream/learn-claude-code/*/README.md",
    );
    expect(found).toEqual([
      "tests/fixtures/upstream/learn-claude-code/s01_agent_loop/README.md",
    ]);
    expect(expandGlob(process.cwd(), "nope-folder/*")).toEqual([]);
  });
});

describe("resolveCloneDir", () => {
  it("explains that network clone is not implemented", () => {
    const source = { id: "x", local: "x-clone" } as Parameters<typeof resolveCloneDir>[0];
    expect(() => resolveCloneDir(source, undefined)).toThrow(/--from-local/);
    expect(() => resolveCloneDir(source, "C:/definitely/missing")).toThrow(/not found/);
  });
});
