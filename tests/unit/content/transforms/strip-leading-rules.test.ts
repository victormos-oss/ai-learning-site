import { describe, expect, it } from "vitest";
import { parseMarkdown, stringifyMdx } from "../../../../scripts/content/lib/mdast";
import { stripLeadingRules } from "../../../../scripts/content/transforms/strip-leading-rules";

describe("stripLeadingRules", () => {
  it("removes rules at the start of the body but keeps later ones", () => {
    const out = stringifyMdx(stripLeadingRules(parseMarkdown("---\n\n---\n\nText\n\n---\n\nMore\n")));
    expect(out.trimStart().startsWith("Text")).toBe(true);
    expect(out).toMatch(/\n(---|\*\*\*)\n/);
  });

  it("returns the same tree when nothing leads", () => {
    const tree = parseMarkdown("Text\n");
    expect(stripLeadingRules(tree)).toBe(tree);
  });
});
