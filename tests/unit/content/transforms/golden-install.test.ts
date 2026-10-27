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
const COMMIT = "8e7d4bf8ed384d08bdbb23f8408ec715fc259bc3";
const FIXTURE = join(
  ROOT,
  "tests/fixtures/upstream/cc-best-practices-usman/guides/getting-started.md",
);
const EXPECTED = join(ROOT, "tests/fixtures/expected/install.en.mdx");

const sources = loadSources(join(ROOT, "content/sources/sources.yaml"));
const source = findSource(sources, "cc-best-practices-usman");
const mapping = loadMapping(
  join(ROOT, "content/sources/mapping/cc-best-practices-usman.yaml"),
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
    assetFiles: [],
    extras: [],
  });
}

describe("transformLesson on the real getting-started.md guide", () => {
  const result = transformFixture();

  it("matches the golden en.mdx byte for byte", () => {
    expect(result.mdx).toBe(readFileSync(EXPECTED, "utf8"));
  });

  it("produces valid frontmatter with the mapping type", () => {
    const parsed = lessonFrontmatterSchema.parse(result.frontmatter);
    expect(parsed.key).toBe("cc-zero.install");
    expect(parsed.title).toBe("Getting Started with Claude Code");
    expect(parsed.type).toBe("learn");
    expect(parsed.attribution[0]?.path).toBe("guides/getting-started.md");
    expect(parsed.attribution[0]?.relation).toBe("adapted");
  });

  it("routes guide links to sibling lessons and the rest to GitHub on the commit", () => {
    expect(result.body).toContain("(/tracks/claude-code-zero/claude-md)");
    expect(result.body).toContain("(/tracks/claude-code-zero/permission-modes)");
    expect(result.body).toContain(
      `https://github.com/MuhammadUsmanGM/claude-code-best-practices/blob/${COMMIT}/tools/quickstart-prompt.md`,
    );
    expect(result.body).toContain(
      `https://github.com/MuhammadUsmanGM/claude-code-best-practices/blob/${COMMIT}/guides/tips-and-tricks.md`,
    );
  });

  it("keeps the See Also list at the very end and has no H1 in the body", () => {
    expect(result.body.trimEnd().split("\n").at(-1)).toMatch(/^- \[Permission Modes\]/);
    expect(result.body).not.toMatch(/^# /m);
  });

  it("compiles with @mdx-js/mdx", async () => {
    const compiled = await compile(result.body, { remarkPlugins: [remarkGfm] });
    expect(String(compiled)).toContain("Prerequisites");
  });
});
