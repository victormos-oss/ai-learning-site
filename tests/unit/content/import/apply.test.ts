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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { lessonFrontmatterSchema } from "@/features/content/schema";
import { parseCliArgs } from "../../../../scripts/content/import/cli-args";
import { readLock } from "../../../../scripts/content/import/lock";
import { runImport, type RunOptions } from "../../../../scripts/content/import/run";

const COMMIT = "ce8f9f186058939da54c9d6fead78dfb5d0fd6c3";
const FIXTURE_README = join(
  process.cwd(),
  "tests/fixtures/upstream/learn-claude-code/s01_agent_loop/README.md",
);
const GOLDEN = join(process.cwd(), "tests/fixtures/expected/s01-agent-loop.en.mdx");

const SOURCES_YAML = `
sources:
  - id: learn-claude-code
    name: learn-claude-code
    url: https://github.com/shareAI-lab/learn-claude-code
    local: fake-clone
    license: MIT
    authors: shareAI-lab contributors
    use: adapt
    include: ["s[0-9][0-9]_*/README.md", "s[0-9][0-9]_*/code.py", "s[0-9][0-9]_*/images/*"]
    exclude: ["docs/**"]
`;

const MAPPING_YAML = `
source: learn-claude-code
track: claude-code-zero
entries:
  - { from: s01_agent_loop/README.md, key: cc-zero.agent-loop, module: 02-one-agent, slug: agent-loop, order: 1, code: code.py, assets: ["images/*"], estimatedMinutes: 5 }
  - { from: s02_tool_use/README.md, key: cc-zero.tool-use, module: 02-one-agent, slug: tool-use, order: 2, assets: ["images/*"], estimatedMinutes: 5 }
`;

const S02_README =
  "# s02: Tool Use — Add a Tool\n\n[English](README.md) · [中文](README.zh.md)\n\ns01 → `s02`\n\nBack to [s01](../s01_agent_loop/).\n";
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>1</script><use href="#a"/></svg>';

function write(path: string, content: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function setupWorkspace(): { root: string; clones: string; clone: string } {
  const base = mkdtempSync(join(tmpdir(), "content-import-"));
  const root = join(base, "project");
  const clones = join(base, "clones");
  const clone = join(clones, "fake-clone");
  write(join(root, "content/sources/sources.yaml"), SOURCES_YAML);
  write(join(root, "content/sources/mapping/learn-claude-code.yaml"), MAPPING_YAML);
  write(join(clone, "s01_agent_loop/README.md"), readFileSync(FIXTURE_README, "utf8"));
  write(join(clone, "s01_agent_loop/code.py"), "print('hi')\n");
  write(join(clone, "s01_agent_loop/images/agent-loop.en.svg"), SVG);
  write(join(clone, "s01_agent_loop/images/agent-loop.svg"), SVG);
  // Binary asset must survive the copy byte for byte.
  writeFileSync(join(clone, "s01_agent_loop/images/photo.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]));
  write(join(clone, "s02_tool_use/README.md"), S02_README);
  return { root, clones, clone };
}

describe("content import end to end (temp workspace)", () => {
  const ws = setupWorkspace();
  const lessonDir = join(
    ws.root,
    "content/tracks/claude-code-zero/modules/02-one-agent/lessons/01-agent-loop",
  );
  const enMdx = join(lessonDir, "en.mdx");
  const run = (mode: RunOptions["mode"], extra: Partial<RunOptions> = {}) =>
    runImport({
      root: ws.root,
      mode,
      fromLocal: ws.clones,
      resolveCommit: () => COMMIT,
      now: new Date("2026-10-25T12:00:00.000Z"),
      ...extra,
    });

  beforeAll(() => undefined);
  afterAll(() => rmSync(join(ws.root, ".."), { recursive: true, force: true }));

  it("--check on a fresh workspace reports NEW files, exits 1 and writes nothing", () => {
    const result = run("check");
    expect(result.exitCode).toBe(1);
    expect(result.sources[0]?.comparison.counts.NEW).toBe(6);
    expect(existsSync(join(ws.root, "content/sources/sources.lock.json"))).toBe(false);
    expect(existsSync(join(ws.root, "content/reports"))).toBe(false);
  });

  it("--apply writes upstream copy, lesson files, lock and report", () => {
    const result = run("apply");
    expect(result.exitCode).toBe(0);
    expect(readFileSync(enMdx, "utf8")).toBe(readFileSync(GOLDEN, "utf8"));
    expect(existsSync(join(lessonDir, "code.py"))).toBe(true);
    const svg = readFileSync(join(lessonDir, "assets/agent-loop.en.svg"), "utf8");
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain("onload");
    expect(svg).toContain('href="#a"');
    expect(
      readFileSync(
        join(
          ws.root,
          "content/_upstream/learn-claude-code/s01_agent_loop/images/agent-loop.en.svg",
        ),
        "utf8",
      ),
    ).toBe(SVG);
    const lock = readLock(join(ws.root, "content/sources/sources.lock.json"));
    expect(lock.sources["learn-claude-code"]?.commit).toBe(COMMIT);
    expect(Object.keys(lock.sources["learn-claude-code"]?.files ?? {})).toHaveLength(6);
    const png = readFileSync(join(ws.root, "content/_upstream/learn-claude-code/s01_agent_loop/images/photo.png"));
    expect([...png]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]);
    expect(readFileSync(result.reportPath!, "utf8")).toContain("| NEW");
  });

  it("writes the s02 lesson with internal links and valid frontmatter", () => {
    const mdx = readFileSync(
      join(
        ws.root,
        "content/tracks/claude-code-zero/modules/02-one-agent/lessons/02-tool-use/en.mdx",
      ),
      "utf8",
    );
    expect(mdx).toContain("[s01](/tracks/claude-code-zero/agent-loop)");
    expect(mdx).not.toContain("[English](");
    const yaml = mdx.split("---")[1] ?? "";
    expect(yaml).toContain("title: Tool Use");
    expect(() =>
      lessonFrontmatterSchema.parse({
        key: "cc-zero.tool-use",
        slug: "tool-use",
        title: "Tool Use",
        summary: "Add a Tool",
        order: 2,
        attribution: [
          {
            source: "x",
            license: "MIT",
            authors: "y",
            url: "https://a.test",
            relation: "adapted",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("is idempotent: --check exits 0 and --apply changes nothing", () => {
    expect(run("check").exitCode).toBe(0);
    const before = readFileSync(enMdx, "utf8");
    const result = run("apply");
    expect(result.exitCode).toBe(0);
    expect(result.sources[0]?.apply?.written.some((p) => p.endsWith("en.mdx"))).toBe(
      false,
    );
    expect(readFileSync(enMdx, "utf8")).toBe(before);
    expect(existsSync(`${enMdx}.proposed`)).toBe(false);
  });

  it("leaves a hand-edited en.mdx alone while upstream is unchanged", () => {
    const edited = readFileSync(enMdx, "utf8").replace(
      "## The Problem",
      "## The Problem (edited)",
    );
    writeFileSync(enMdx, edited);
    expect(run("apply").exitCode).toBe(0);
    expect(readFileSync(enMdx, "utf8")).toBe(edited);
    expect(existsSync(`${enMdx}.proposed`)).toBe(false);
  });

  it("merges an upstream change into en.mdx.proposed without conflict", () => {
    const readme = join(ws.clone, "s01_agent_loop/README.md");
    writeFileSync(
      readme,
      `${readFileSync(readme, "utf8")}\nA brand new upstream paragraph.\n`,
    );
    expect(run("check").exitCode).toBe(1);
    const result = run("apply", {
      resolveCommit: () => "1111111111111111111111111111111111111111",
    });
    expect(result.exitCode).toBe(0);
    expect(result.sources[0]?.apply?.proposed).toHaveLength(1);
    const proposed = readFileSync(`${enMdx}.proposed`, "utf8");
    expect(proposed).toContain("A brand new upstream paragraph.");
    expect(proposed).toContain("## The Problem (edited)");
    // yaml quotes all-digit strings, so accept both spellings.
    expect(proposed).toMatch(/commit: "?1111111/);
    expect(proposed).not.toContain("<<<<<<<");
    expect(readFileSync(enMdx, "utf8")).toContain("## The Problem (edited)");
  });

  it("exits 2 with conflict markers when both sides change the same line", () => {
    const readme = join(ws.clone, "s01_agent_loop/README.md");
    writeFileSync(
      readme,
      readFileSync(readme, "utf8").replace("## The Problem", "## The Upstream Problem"),
    );
    const result = run("apply", {
      resolveCommit: () => "2222222222222222222222222222222222222222",
    });
    expect(result.exitCode).toBe(2);
    expect(readFileSync(`${enMdx}.proposed`, "utf8")).toContain("<<<<<<< ours (en.mdx)");
  });

  it("reports REMOVED upstream files and honours --only", () => {
    rmSync(join(ws.clone, "s01_agent_loop/images/agent-loop.svg"));
    const result = run("check", { only: "cc-zero.agent-loop" });
    expect(result.exitCode).toBe(1);
    const removed = result.sources[0]?.comparison.changes.filter(
      (c) => c.status === "REMOVED",
    );
    expect(removed?.map((c) => c.path)).toEqual(["s01_agent_loop/images/agent-loop.svg"]);
    expect(
      result.sources[0]?.comparison.changes.some((c) => c.path.startsWith("s02_")),
    ).toBe(false);
  });

  it("refuses to run without --from-local", () => {
    expect(() => run("check", { fromLocal: undefined })).toThrow(/--from-local/);
  });
});

describe("parseCliArgs", () => {
  it("requires exactly one mode and maps flags", () => {
    expect(
      parseCliArgs(["--check", "--source", "x", "--only", "k", "--from-local", "d"]),
    ).toEqual({
      mode: "check",
      sourceId: "x",
      only: "k",
      fromLocal: "d",
    });
    expect(parseCliArgs(["--apply"])).toEqual({ mode: "apply" });
    expect(() => parseCliArgs([])).toThrow(/exactly one/);
    expect(() => parseCliArgs(["--check", "--apply"])).toThrow(/exactly one/);
  });
});
