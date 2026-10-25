import { compile } from "@mdx-js/mdx";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { lessonFrontmatterSchema } from "@/features/content/schema";
import { loadMapping } from "../../../../scripts/content/lib/mapping-schema";
import { findSource, loadSources } from "../../../../scripts/content/lib/sources-schema";
import { transformLesson } from "../../../../scripts/content/transforms";

const ROOT = process.cwd();
const COMMIT = "ce8f9f186058939da54c9d6fead78dfb5d0fd6c3";
const FIXTURE = join(
  ROOT,
  "tests/fixtures/upstream/learn-claude-code/s01_agent_loop/README.md",
);
const EXPECTED = join(ROOT, "tests/fixtures/expected/s01-agent-loop.en.mdx");

const sources = loadSources(join(ROOT, "content/sources/sources.yaml"));
const source = findSource(sources, "learn-claude-code");
const mapping = loadMapping(
  join(ROOT, "content/sources/mapping/learn-claude-code.yaml"),
  source,
);

function transformFixture() {
  return transformLesson({
    markdown: readFileSync(FIXTURE, "utf8"),
    entry: mapping.entries[0]!,
    entries: mapping.entries,
    track: mapping.track,
    source,
    commit: COMMIT,
    assetFiles: [
      "images/agent-loop.en.svg",
      "images/agent-loop.ja.svg",
      "images/agent-loop.svg",
    ],
  });
}

describe("transformLesson on the real s01 README", () => {
  const result = transformFixture();

  it("matches the golden en.mdx byte for byte", () => {
    expect(result.mdx).toBe(readFileSync(EXPECTED, "utf8"));
  });

  it("produces frontmatter that passes lessonFrontmatterSchema", () => {
    const parsed = lessonFrontmatterSchema.parse(result.frontmatter);
    expect(parsed.key).toBe("cc-zero.agent-loop");
    expect(parsed.title).toBe("The Agent Loop");
    expect(parsed.title).not.toMatch(/[—–]/);
    expect(parsed.summary).not.toMatch(/[—–]/);
    expect(parsed.attribution[0]?.url).toBe(
      `https://github.com/shareAI-lab/learn-claude-code/tree/${COMMIT}/s01_agent_loop`,
    );
  });

  it("contains no upstream navigation noise", () => {
    expect(result.body).not.toContain("<!--");
    expect(result.body).not.toContain("[English](");
    expect(result.body).not.toContain("`s01` →");
    expect(result.body).not.toMatch(/^→ s02/m);
    // The H1 moved into frontmatter; `# ...` inside shell fences is fine.
    expect(result.body).not.toContain("# s01:");
  });

  it("uses the lesson components and reports the asset", () => {
    expect(result.body).toContain('<Figure src="agent-loop" alt="Agent Loop" />');
    expect(result.body).toContain('<CodeFile src="code.py" />');
    expect(result.assets).toEqual([
      {
        base: "agent-loop",
        file: "images/agent-loop.en.svg",
        target: "assets/agent-loop.en.svg",
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("compiles with @mdx-js/mdx", async () => {
    const compiled = await compile(result.body, { remarkPlugins: [remarkGfm] });
    expect(String(compiled)).toContain("Figure");
    expect(String(compiled)).toContain("CodeFile");
  });

  it("is deterministic", () => {
    expect(transformFixture().mdx).toBe(result.mdx);
  });
});
