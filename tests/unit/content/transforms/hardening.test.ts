import { describe, expect, it } from "vitest";
import {
  looksLikeSvg,
  sanitizeSvg,
} from "../../../../scripts/content/transforms/sanitize-svg";
import { rewriteImages } from "../../../../scripts/content/transforms/rewrite-images";
import { parseMarkdown } from "../../../../scripts/content/lib/mdast";

describe("sanitizeSvg with namespace prefixes", () => {
  it("removes prefixed script and embedding elements", () => {
    const svg =
      '<svg xmlns:s="http://www.w3.org/2000/svg"><s:script>alert(1)</s:script>' +
      '<svg:foreignObject><div>x</div></svg:foreignObject><use href="#ok"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/foreignObject/i);
    expect(out).toContain('href="#ok"');
  });

  it("removes prefixed event handlers, data hrefs and style url()", () => {
    const svg =
      '<svg xlink:onload="x()"><a xlink:href="data:text/html,<script>1</script>">t</a>' +
      '<rect style="fill:url(https://evil.test/a.svg)"/><circle style="fill:red"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toContain("data:");
    expect(out).not.toContain("evil.test");
    expect(out).toContain('style="fill:red"');
  });
});

describe("looksLikeSvg", () => {
  it("detects svg by content regardless of extension", () => {
    expect(looksLikeSvg(Buffer.from("  <svg xmlns='x'></svg>"))).toBe(true);
    expect(looksLikeSvg(Buffer.from('<?xml version="1.0"?>\n<svg/>'))).toBe(true);
    expect(looksLikeSvg(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});

describe("rewriteImages edge cases", () => {
  it("fails on two different files that would share one Figure name", () => {
    const tree = parseMarkdown("![a](images/a/loop.svg)\n\n![b](images/b/loop.svg)\n");
    expect(() => rewriteImages(tree, ["images/a/loop.svg", "images/b/loop.svg"])).toThrow(
      /collision/,
    );
  });

  it("drops external and data images with a warning and keeps the alt text", () => {
    const tree = parseMarkdown(
      "Look ![pixel](https://tracker.test/p.png) here\n\n![d](data:image/png;base64,AAAA)\n",
    );
    const result = rewriteImages(tree, []);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toMatch(/external image/);
    const text = JSON.stringify(result.tree);
    expect(text).not.toContain("tracker.test");
    expect(text).toContain("[pixel]");
  });
});
