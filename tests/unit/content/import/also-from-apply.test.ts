import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readLock } from "../../../../scripts/content/import/lock";
import { runImport, type RunOptions } from "../../../../scripts/content/import/run";

const COMMIT = "8e7d4bf8ed384d08bdbb23f8408ec715fc259bc3";

const SOURCES_YAML = `
sources:
  - id: cc-best-practices-usman
    name: claude-code-best-practices (MuhammadUsmanGM)
    url: https://github.com/MuhammadUsmanGM/claude-code-best-practices
    local: fake-usman
    license: MIT
    authors: Muhammad Usman and contributors
    use: adapt
    include: ["guides/*.md", "guides/images/*.svg"]
`;

const MAPPING_YAML = `
source: cc-best-practices-usman
track: claude-code-zero
entries:
  - from: guides/context-management.md
    alsoFrom: [guides/cost-management.md]
    assets: ["images/*.svg"]
    key: cc-zero.context-and-cost
    module: 01-getting-started
    slug: context-and-cost
    order: 6
    type: build
    estimatedMinutes: 20
`;

const CONTEXT_MD = [
  "# Managing the Context Window",
  "",
  "Intro about context.",
  "",
  "## The /compact Command",
  "",
  "Use it. See [Cost Management](cost-management.md).",
  "",
  "## See Also",
  "",
  "- [Cost Management](cost-management.md)",
  "- [Hooks](hooks.md)",
  "",
].join("\n");

const COST_MD = [
  "# Cost Management",
  "",
  "Tokens cost money.",
  "",
  "![Spend chart](images/spend.svg)",
  "",
  "## Track Your Spend",
  "",
  "Use `/cost`.",
  "",
  "## See Also",
  "",
  "- [Context Management](context-management.md)",
  "",
].join("\n");

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function setupWorkspace(): { root: string; clones: string; clone: string } {
  const base = mkdtempSync(join(tmpdir(), "content-also-from-"));
  const root = join(base, "project");
  const clones = join(base, "clones");
  const clone = join(clones, "fake-usman");
  write(join(root, "content/sources/sources.yaml"), SOURCES_YAML);
  write(join(root, "content/sources/mapping/cc-best-practices-usman.yaml"), MAPPING_YAML);
  write(join(clone, "guides/context-management.md"), CONTEXT_MD);
  write(join(clone, "guides/cost-management.md"), COST_MD);
  write(
    join(clone, "guides/images/spend.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
  );
  return { root, clones, clone };
}

describe("import with alsoFrom (temp workspace)", () => {
  const ws = setupWorkspace();
  const enMdx = join(
    ws.root,
    "content/tracks/claude-code-zero/modules/01-getting-started/lessons/06-context-and-cost/en.mdx",
  );
  const run = (mode: RunOptions["mode"], extra: Partial<RunOptions> = {}) =>
    runImport({
      root: ws.root,
      mode,
      fromLocal: ws.clones,
      resolveCommit: () => COMMIT,
      now: new Date("2026-10-26T12:00:00.000Z"),
      ...extra,
    });

  afterAll(() => rmSync(join(ws.root, ".."), { recursive: true, force: true }));

  it("--check reports both markdown files and the extra's image as NEW", () => {
    const result = run("check");
    expect(result.exitCode).toBe(1);
    expect(result.sources[0]?.comparison.counts.NEW).toBe(3);
  });

  it("--apply writes one lesson with the extra file appended and both files locked", () => {
    expect(run("apply").exitCode).toBe(0);
    const mdx = readFileSync(enMdx, "utf8");
    expect(mdx).toContain("type: build");
    expect(mdx).toContain("title: Managing the Context Window");
    expect(mdx).toContain("## The /compact Command");
    expect(mdx).toContain("## Cost Management");
    expect(mdx).toContain("### Track Your Spend");
    // Links to a file of the same lesson stay on the site.
    expect(mdx).toContain("[Cost Management](/tracks/claude-code-zero/context-and-cost)");
    expect(mdx).toContain(`/blob/${COMMIT}/guides/hooks.md`);
    // Only the main See Also survives, after the appended material.
    expect(mdx.match(/## See Also/g)).toHaveLength(1);
    expect(mdx.indexOf("## See Also")).toBeGreaterThan(
      mdx.indexOf("### Track Your Spend"),
    );
    // An image referenced only by the extra file is rewritten and its asset copied.
    expect(mdx).toContain('<Figure src="spend" alt="Spend chart" />');
    expect(existsSync(join(enMdx, "..", "assets", "spend.en.svg"))).toBe(true);
    const lock = readLock(join(ws.root, "content/sources/sources.lock.json"));
    expect(Object.keys(lock.sources["cc-best-practices-usman"]?.files ?? {})).toEqual([
      "guides/context-management.md",
      "guides/cost-management.md",
      "guides/images/spend.svg",
    ]);
    expect(
      existsSync(
        join(
          ws.root,
          "content/_upstream/cc-best-practices-usman/guides/cost-management.md",
        ),
      ),
    ).toBe(true);
  });

  it("is idempotent", () => {
    expect(run("check").exitCode).toBe(0);
    const before = readFileSync(enMdx, "utf8");
    expect(run("apply").exitCode).toBe(0);
    expect(readFileSync(enMdx, "utf8")).toBe(before);
  });

  it("a change in the extra file alone is detected and merged into a proposal", () => {
    const cost = join(ws.clone, "guides/cost-management.md");
    writeFileSync(
      cost,
      readFileSync(cost, "utf8").replace("Tokens cost money.", "Tokens cost real money."),
    );
    expect(run("check").exitCode).toBe(1);
    const edited = readFileSync(enMdx, "utf8").replace(
      "Intro about context.",
      "Intro (edited).",
    );
    writeFileSync(enMdx, edited);
    const result = run("apply", {
      resolveCommit: () => "1111111111111111111111111111111111111111",
    });
    expect(result.exitCode).toBe(0);
    const proposed = readFileSync(`${enMdx}.proposed`, "utf8");
    expect(proposed).toContain("Tokens cost real money.");
    expect(proposed).toContain("Intro (edited).");
    expect(proposed).not.toContain("<<<<<<<");
  });
});
