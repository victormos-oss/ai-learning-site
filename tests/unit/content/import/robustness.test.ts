import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertRegularFileInside } from "../../../../scripts/content/import/apply";
import { readLock } from "../../../../scripts/content/import/lock";
import { runImport } from "../../../../scripts/content/import/run";

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
  - { from: s01_agent_loop/README.md, key: cc-zero.agent-loop, module: 02-one-agent, slug: agent-loop, order: 1, assets: ["images/*"], estimatedMinutes: 5 }
  - { from: s02_tool_use/README.md, key: cc-zero.tool-use, module: 02-one-agent, slug: tool-use, order: 2, assets: ["images/*"], estimatedMinutes: 5 }
`;

const README = (n: string) =>
  `# s0${n}: Lesson ${n} — Short summary\n\nBody of lesson ${n}.\n`;

function write(path: string, content: string | Buffer): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, content);
}

function workspace(): { root: string; clones: string; clone: string } {
  const base = mkdtempSync(join(tmpdir(), "import-robust-"));
  const root = join(base, "project");
  const clones = join(base, "clones");
  const clone = join(clones, "fake-clone");
  write(join(root, "content/sources/sources.yaml"), SOURCES_YAML);
  write(join(root, "content/sources/mapping/learn-claude-code.yaml"), MAPPING_YAML);
  write(join(clone, "s01_agent_loop/README.md"), README("1"));
  write(join(clone, "s02_tool_use/README.md"), README("2"));
  return { root, clones, clone };
}

const COMMIT_A = "a".repeat(40);
const COMMIT_B = "b".repeat(40);

describe("import robustness", () => {
  it("keeps finished entries in the lock when a later entry fails, and does not pin the failed upstream", () => {
    const ws = workspace();
    // The second entry fails inside its transform: two images collapse to one Figure name.
    write(join(ws.clone, "s02_tool_use/images/loop.png"), Buffer.from([0x89, 0x50]));
    write(join(ws.clone, "s02_tool_use/images/loop.svg"), "<svg/>");
    write(
      join(ws.clone, "s02_tool_use/README.md"),
      `${README("2")}\n![a](images/loop.png)\n\n![b](images/loop.svg)\n`,
    );

    expect(() =>
      runImport({
        root: ws.root,
        mode: "apply",
        fromLocal: ws.clones,
        resolveCommit: () => COMMIT_A,
      }),
    ).toThrow(/collision/);

    const lock = readLock(join(ws.root, "content/sources/sources.lock.json"));
    expect(Object.keys(lock.sources["learn-claude-code"]?.files ?? {})).toEqual([
      "s01_agent_loop/README.md",
    ]);
    expect(
      existsSync(
        join(ws.root, "content/_upstream/learn-claude-code/s01_agent_loop/README.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(join(ws.root, "content/_upstream/learn-claude-code/s02_tool_use")),
    ).toBe(false);
  });

  it("refuses --only when the clone commit differs from the locked commit", () => {
    const ws = workspace();
    const full = runImport({
      root: ws.root,
      mode: "apply",
      fromLocal: ws.clones,
      resolveCommit: () => COMMIT_A,
    });
    expect(full.exitCode).toBe(0);
    expect(() =>
      runImport({
        root: ws.root,
        mode: "apply",
        fromLocal: ws.clones,
        only: "cc-zero.agent-loop",
        resolveCommit: () => COMMIT_B,
      }),
    ).toThrow(/mix commits/);
    const sameCommit = runImport({
      root: ws.root,
      mode: "apply",
      fromLocal: ws.clones,
      only: "cc-zero.agent-loop",
      resolveCommit: () => COMMIT_A,
    });
    expect(sameCommit.exitCode).toBe(0);
  });

  it("sanitizes assets with an uppercase .SVG extension", () => {
    const ws = workspace();
    write(
      join(ws.clone, "s01_agent_loop/images/diagram.SVG"),
      '<svg onload="x()"><script>1</script></svg>',
    );
    write(
      join(ws.clone, "s01_agent_loop/README.md"),
      `${README("1")}\n![d](images/diagram.SVG)\n`,
    );
    runImport({
      root: ws.root,
      mode: "apply",
      fromLocal: ws.clones,
      resolveCommit: () => COMMIT_A,
    });
    const lessonAssets = join(
      ws.root,
      "content/tracks/claude-code-zero/modules/02-one-agent/lessons/01-agent-loop/assets",
    );
    const written = readFileSync(join(lessonAssets, "diagram.en.SVG"), "utf8");
    expect(written).not.toMatch(/script|onload/i);
  });

  it("rejects directories and paths that escape the clone", () => {
    const ws = workspace();
    expect(() => assertRegularFileInside(ws.clone, "s01_agent_loop")).toThrow(
      /regular file/,
    );
    expect(() => assertRegularFileInside(ws.clone, "../outside.md")).toThrow(
      /regular file|outside/,
    );
    expect(assertRegularFileInside(ws.clone, "s01_agent_loop/README.md")).toContain(
      "README.md",
    );
  });
});
