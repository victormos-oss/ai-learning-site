import { describe, expect, it } from "vitest";
import { parseMarkdown, stringifyMdx } from "../../../../scripts/content/lib/mdast";
import { stripHtmlComments } from "../../../../scripts/content/transforms/strip-html-comments";
import { stripLangBar } from "../../../../scripts/content/transforms/strip-lang-bar";
import { stripNavChain } from "../../../../scripts/content/transforms/strip-nav-chain";
import { stripNextArrow } from "../../../../scripts/content/transforms/strip-next-arrow";

const roundTrip = (
  md: string,
  fn: (t: ReturnType<typeof parseMarkdown>) => ReturnType<typeof parseMarkdown>,
) => stringifyMdx(fn(parseMarkdown(md)));

describe("stripLangBar", () => {
  it("removes the language switcher paragraph and keeps the rest", () => {
    const md = [
      "# Title",
      "",
      "[English](README.md) · [中文](README.zh.md) · [日本語](README.ja.md)",
      "",
      "Body text with a [real link](https://example.com).",
    ].join("\n");
    const out = roundTrip(md, stripLangBar);
    expect(out).not.toContain("[English](");
    expect(out).toContain("[real link](https://example.com)");
  });

  it("does not touch the input tree", () => {
    const tree = parseMarkdown("[English](README.md) · [中文](README.zh.md)");
    const before = JSON.stringify(tree);
    stripLangBar(tree);
    expect(JSON.stringify(tree)).toBe(before);
  });
});

describe("stripNavChain", () => {
  it.each([
    "`s01` → [s02](../s02_tool_use/) → s03 → s04 → ... → s16 → s17",
    "s01 → ... → s07 → s08 → `s09` → [s10](../s10_task_system/) → s11 → ... → s16 → s17",
    "[s04](../s04_hooks/) → `s14` → [s15](../s15_integrated_harness/) → s16 → s17",
  ])("removes the chain %s", (chain) => {
    const md = `${chain}\n\n> Quote stays.\n\nParagraph stays.`;
    const out = roundTrip(md, stripNavChain);
    expect(out).not.toContain("→");
    expect(out).toContain("Quote stays.");
    expect(out).toContain("Paragraph stays.");
  });

  it("removes the chain even when a blockquote follows without a blank line", () => {
    const md = '`s01` → [s02](../s02_tool_use/) → s03\n> *"One loop"* — tagline.';
    const out = roundTrip(md, stripNavChain);
    expect(out).not.toContain("`s01`");
    expect(out).toContain("One loop");
  });

  it("leaves prose that merely mentions an arrow", () => {
    const md = "Execute → feed result back → continue, says the table.";
    expect(roundTrip(md, stripNavChain)).toContain("feed result back");
  });
});

describe("stripHtmlComments", () => {
  it("drops block and inline comments", () => {
    const md = "Intro <!-- inline --> text.\n\n<!-- translation-sync: zh@v2 -->\n\nEnd.";
    const out = roundTrip(md, stripHtmlComments);
    expect(out).not.toContain("<!--");
    expect(out).toMatch(/Intro\s+text\./);
    expect(out).toContain("End.");
  });

  it("turns leftover raw html into escaped literal text", () => {
    const out = roundTrip("Use <reminder> here.", stripHtmlComments);
    expect(out).toContain("\\<reminder>");
  });
});

describe("stripNextArrow", () => {
  it("removes the teaser arrow line in What's Next", () => {
    const md = [
      "## What's Next",
      "",
      "Right now the model only has bash.",
      "",
      "→ s02 Tool Use: What happens when we give it 5 proper tools?",
    ].join("\n");
    const out = roundTrip(md, stripNextArrow);
    expect(out).not.toContain("→ s02");
    expect(out).toContain("Right now the model only has bash.");
  });

  it("keeps arrows that do not point to a section", () => {
    const out = roundTrip("→ a plain arrow paragraph", stripNextArrow);
    expect(out).toContain("plain arrow");
  });
});
