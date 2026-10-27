import { describe, expect, it } from "vitest";
import { parseMarkdown, stringifyMdx } from "../../../../scripts/content/lib/mdast";
import {
  appendExtras,
  headingFromFileName,
} from "../../../../scripts/content/transforms/append-extras";
import {
  admonitionKind,
  mkdocsAdmonitions,
} from "../../../../scripts/content/transforms/mkdocs-admonitions";
import {
  splitSeeAlso,
  stripMaterialNav,
  stripMkdocsFrontmatter,
} from "../../../../scripts/content/transforms/strip-mkdocs-front";

const roundTrip = (md: string, fn: (t: ReturnType<typeof parseMarkdown>) => ReturnType<typeof parseMarkdown>) =>
  stringifyMdx(fn(parseMarkdown(md)));

describe("mkdocsAdmonitions", () => {
  it("turns a titled note with an indented body into a Callout", () => {
    const md = ['!!! note "Heads up"', "", "    Body paragraph with `code`.", "", "After."].join("\n");
    const out = roundTrip(md, mkdocsAdmonitions);
    expect(out).toContain('<Callout kind="note" title="Heads up">');
    expect(out).toContain("Body paragraph with `code`.");
    expect(out).toContain("</Callout>");
    expect(out.indexOf("</Callout>")).toBeLessThan(out.indexOf("After."));
    expect(out).not.toContain("!!!");
  });

  it("handles a collapsible tip without a blank line and defaults the title", () => {
    const md = "??? tip\n    Lazy continuation body.\n\nNext paragraph.";
    const out = roundTrip(md, mkdocsAdmonitions);
    expect(out).toContain('<Callout kind="tip" title="Tip">');
    expect(out).toContain("Lazy continuation body.");
    expect(out).toContain("Next paragraph.");
  });

  it("keeps lists inside the admonition body", () => {
    const md = ['!!! warning "Careful"', "", "    - one", "    - two"].join("\n");
    const out = roundTrip(md, mkdocsAdmonitions);
    expect(out).toContain('<Callout kind="warning" title="Careful">');
    expect(out).toContain("- one");
    expect(out).toContain("- two");
  });

  it("maps admonition types onto the three Callout kinds", () => {
    expect(admonitionKind("note")).toBe("note");
    expect(admonitionKind("info")).toBe("note");
    expect(admonitionKind("hint")).toBe("tip");
    expect(admonitionKind("success")).toBe("tip");
    expect(admonitionKind("danger")).toBe("warning");
    expect(admonitionKind("caution")).toBe("warning");
    expect(admonitionKind("Something-Else")).toBe("note");
  });

  it("leaves ordinary paragraphs and exclamations alone", () => {
    const md = "Wow!!! That was close.\n\n!!!not an admonition";
    expect(roundTrip(md, mkdocsAdmonitions)).not.toContain("Callout");
  });

  it("does not mutate the input tree", () => {
    const tree = parseMarkdown('!!! note "T"\n\n    body');
    const before = JSON.stringify(tree);
    mkdocsAdmonitions(tree);
    expect(JSON.stringify(tree)).toBe(before);
  });
});

describe("stripMkdocsFrontmatter", () => {
  it("drops a leading yaml block", () => {
    const md = "---\nhide:\n  - navigation\n---\n\n# Title\n\nBody.";
    expect(stripMkdocsFrontmatter(md)).toBe("# Title\n\nBody.");
  });

  it("keeps a thematic break that is not frontmatter", () => {
    const md = "# Title\n\n---\n\nBody.";
    expect(stripMkdocsFrontmatter(md)).toBe(md);
  });
});

describe("stripMaterialNav", () => {
  it("removes button and icon navigation paragraphs", () => {
    const md = [
      "Real paragraph.",
      "",
      "[:octicons-arrow-left-24: Previous](prev.md) · [Next :octicons-arrow-right-24:](next.md)",
      "",
      "[Get started](install.md){ .md-button .md-button--primary }",
    ].join("\n");
    const out = roundTrip(md, stripMaterialNav);
    expect(out).toContain("Real paragraph.");
    expect(out).not.toContain("octicons");
    expect(out).not.toContain("md-button");
  });

  it("keeps a plain paragraph of links", () => {
    const md = "[Docs](https://a.test) and [More](https://b.test)";
    expect(roundTrip(md, stripMaterialNav)).toContain("[Docs](https://a.test)");
  });
});

describe("splitSeeAlso", () => {
  it("detaches the trailing See Also section", () => {
    const md = "# T\n\nBody.\n\n## See Also\n\n- [A](a.md)\n- [B](b.md)\n";
    const result = splitSeeAlso(parseMarkdown(md));
    expect(stringifyMdx(result.tree)).not.toContain("See Also");
    expect(result.seeAlso).toHaveLength(1);
    expect(result.seeAlso[0]?.type).toBe("list");
    expect(stringifyMdx({ type: "root", children: result.seeAlso })).toContain("[A](a.md)");
  });

  it("folds a link-free What's Next lead-in into See Also", () => {
    const md = [
      "# T",
      "",
      "Body.",
      "",
      "## What's Next",
      "",
      "Explore these guides:",
      "",
      "## See Also",
      "",
      "- [A](a.md)",
    ].join("\n");
    const result = splitSeeAlso(parseMarkdown(md));
    const rest = stringifyMdx(result.tree);
    expect(rest).not.toContain("What's Next");
    expect(rest).toContain("Body.");
    expect(result.seeAlso.map((node) => node.type)).toEqual(["paragraph", "list"]);
  });

  it("keeps a What's Next section that has its own links", () => {
    const md = "# T\n\n## What's Next\n\nRead [X](x.md).\n\n## See Also\n\n- [A](a.md)";
    const result = splitSeeAlso(parseMarkdown(md));
    expect(stringifyMdx(result.tree)).toContain("What's Next");
    expect(result.seeAlso).toHaveLength(1);
  });

  it("returns an empty seeAlso when there is none", () => {
    const result = splitSeeAlso(parseMarkdown("# T\n\nBody."));
    expect(result.seeAlso).toEqual([]);
  });
});

describe("appendExtras", () => {
  it("turns file names into headings", () => {
    expect(headingFromFileName("guides/cost-management.md")).toBe("Cost Management");
    expect(headingFromFileName("common_mistakes.md")).toBe("Common Mistakes");
  });

  it("appends each extra under an H2 and demotes its headings", () => {
    const main = parseMarkdown("Intro.\n\n## Main Section\n\nText.");
    const extra = parseMarkdown("Extra intro.\n\n## Extra Section\n\n### Deep\n\nMore.");
    const out = stringifyMdx(
      appendExtras(main, [{ heading: "Cost Management", tree: extra }]),
    );
    expect(out).toContain("## Main Section");
    expect(out).toContain("## Cost Management");
    expect(out).toContain("### Extra Section");
    expect(out).toContain("#### Deep");
    expect(out.indexOf("## Cost Management")).toBeGreaterThan(out.indexOf("## Main Section"));
  });

  it("never demotes below H6 and returns the main tree untouched when no extras", () => {
    const main = parseMarkdown("Intro.");
    expect(appendExtras(main, [])).toBe(main);
    const deep = parseMarkdown("###### Six");
    expect(stringifyMdx(appendExtras(main, [{ heading: "X", tree: deep }]))).toContain(
      "###### Six",
    );
  });
});
