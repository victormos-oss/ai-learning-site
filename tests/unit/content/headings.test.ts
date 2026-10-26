import { describe, expect, it } from "vitest";
import { collectHeadings } from "@/features/content/headings";

describe("collectHeadings", () => {
  it("ignores headings inside code fences and strips inline markup", () => {
    const md = [
      "# Title",
      "",
      "## Use `claude` daily",
      "",
      "```python",
      "## not a heading",
      "```",
      "",
      "### Sub *point*",
      "",
      "#### too deep",
    ].join("\n");
    expect(collectHeadings(md)).toEqual([
      { depth: 2, text: "Use claude daily", id: "use-claude-daily" },
      { depth: 3, text: "Sub point", id: "sub-point" },
    ]);
  });

  it("numbers duplicate headings like rehype-slug", () => {
    const md = "## Try it\n\n## Try it\n";
    expect(collectHeadings(md).map((h) => h.id)).toEqual(["try-it", "try-it-1"]);
  });
});
