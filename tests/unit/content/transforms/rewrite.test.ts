import { describe, expect, it } from "vitest";
import { parseMarkdown, stringifyMdx } from "../../../../scripts/content/lib/mdast";
import type { MappingEntry } from "../../../../scripts/content/lib/mapping-schema";
import {
  extractTitle,
  parseTitle,
  replaceLongDashes,
} from "../../../../scripts/content/transforms/extract-title";
import { inlineCodeFile } from "../../../../scripts/content/transforms/inline-codefile";
import { rewriteImages } from "../../../../scripts/content/transforms/rewrite-images";
import { rewriteLinks } from "../../../../scripts/content/transforms/rewrite-links";
import { sanitizeSvg } from "../../../../scripts/content/transforms/sanitize-svg";

const entry = (from: string, slug: string, order: number): MappingEntry => ({
  from,
  key: `cc-zero.${slug}`,
  module: "02-one-agent",
  slug,
  order,
  assets: [],
  estimatedMinutes: 5,
});

describe("extractTitle", () => {
  it("splits the H1 into title and summary and removes it from the body", () => {
    const md = "# s01: The Agent Loop — One Loop Is All You Need\n\nFirst paragraph.";
    const result = extractTitle(parseMarkdown(md));
    expect(result.title).toBe("The Agent Loop");
    expect(result.summary).toBe("One Loop Is All You Need");
    const body = stringifyMdx(result.tree);
    expect(body).not.toContain("# s01");
    expect(body).toContain("First paragraph.");
  });

  it("falls back to a colon separator and to the first paragraph", () => {
    expect(
      parseTitle("s08: Context Compact: Make Room Before the Context Fills Up"),
    ).toEqual({
      title: "Context Compact",
      subtitle: "Make Room Before the Context Fills Up",
    });
    const result = extractTitle(
      parseMarkdown("# Plain Title\n\n> quote\n\nThe real intro."),
    );
    expect(result.title).toBe("Plain Title");
    expect(result.summary).toBe("The real intro.");
  });

  it("replaces long dashes inside title and summary", () => {
    expect(replaceLongDashes("Loop — fast – safe")).toBe("Loop, fast, safe");
    const result = extractTitle(
      parseMarkdown("# s16: Workflow — The Model Decides — Scripts Decide\n"),
    );
    expect(result.title).toBe("Workflow");
    expect(result.summary).toBe("The Model Decides, Scripts Decide");
    expect(result.summary).not.toMatch(/[—–]/);
  });
});

describe("rewriteImages", () => {
  const files = [
    "images/agent-loop.en.svg",
    "images/agent-loop.ja.svg",
    "images/agent-loop.svg",
  ];

  it("turns a localized svg image into <Figure> and reports the chosen asset", () => {
    const result = rewriteImages(
      parseMarkdown("![Agent Loop](images/agent-loop.en.svg)"),
      files,
    );
    expect(stringifyMdx(result.tree).trim()).toBe(
      '<Figure src="agent-loop" alt="Agent Loop" />',
    );
    expect(result.assets).toEqual([
      {
        base: "agent-loop",
        file: "images/agent-loop.en.svg",
        target: "assets/agent-loop.en.svg",
      },
    ]);
  });

  it("prefers the .en variant even when the plain file is referenced", () => {
    const result = rewriteImages(parseMarkdown("![Loop](images/agent-loop.svg)"), files);
    expect(result.assets[0]?.file).toBe("images/agent-loop.en.svg");
  });

  it("falls back to the plain file when there is no .en variant", () => {
    const result = rewriteImages(parseMarkdown("![X](images/overview.svg)"), [
      "images/overview.svg",
    ]);
    expect(result.assets).toEqual([
      { base: "overview", file: "images/overview.svg", target: "assets/overview.en.svg" },
    ]);
  });

  it("warns about missing files and leaves external images alone", () => {
    const md = "![Missing](images/nope.svg)\n\n![Ext](https://x.test/a.png)";
    const result = rewriteImages(parseMarkdown(md), []);
    expect(result.warnings).toHaveLength(1);
    expect(stringifyMdx(result.tree)).toContain("https://x.test/a.png");
  });
});

describe("inlineCodeFile", () => {
  it("appends <CodeFile> at the end of the Try It section", () => {
    const md =
      "## How\n\nA.\n\n## Try It\n\nRun:\n\n```sh\npython code.py\n```\n\n## What's Next\n\nB.";
    const out = stringifyMdx(inlineCodeFile(parseMarkdown(md), "code.py"));
    const codeFileAt = out.indexOf('<CodeFile src="code.py" />');
    expect(codeFileAt).toBeGreaterThan(out.indexOf("python code.py"));
    expect(codeFileAt).toBeLessThan(out.indexOf("## What's Next"));
  });

  it("appends at the end when no matching heading exists, and skips without code", () => {
    const md = "## Only\n\nText.";
    expect(
      stringifyMdx(inlineCodeFile(parseMarkdown(md), "code.py"))
        .trim()
        .endsWith('<CodeFile src="code.py" />'),
    ).toBe(true);
    expect(stringifyMdx(inlineCodeFile(parseMarkdown(md), undefined)).trim()).toBe(
      "## Only\n\nText.",
    );
  });
});

describe("rewriteLinks", () => {
  const ctx = {
    fromPath: "s01_agent_loop/README.md",
    repoUrl: "https://github.com/shareAI-lab/learn-claude-code",
    commit: "ce8f9f186058939da54c9d6fead78dfb5d0fd6c3",
    track: "claude-code-zero",
    entries: [
      entry("s01_agent_loop/README.md", "agent-loop", 1),
      entry("s02_tool_use/README.md", "tool-use", 2),
    ],
  };

  it("maps sibling sections to internal lesson routes and keeps anchors", () => {
    const md =
      "See [s02](../s02_tool_use/) and [part](../s02_tool_use/README.md#try-it).";
    const out = stringifyMdx(rewriteLinks(parseMarkdown(md), ctx));
    expect(out).toContain("[s02](/tracks/claude-code-zero/tool-use)");
    expect(out).toContain("[part](/tracks/claude-code-zero/tool-use#try-it)");
  });

  it("points other relative links at GitHub on the pinned commit", () => {
    const md =
      "[env](../.env.example), [dir](../docs/), [same](#the-solution), [abs](https://a.test/)";
    const out = stringifyMdx(rewriteLinks(parseMarkdown(md), ctx));
    expect(out).toContain(`[env](${ctx.repoUrl}/blob/${ctx.commit}/.env.example)`);
    expect(out).toContain(`[dir](${ctx.repoUrl}/tree/${ctx.commit}/docs)`);
    expect(out).toContain("[same](#the-solution)");
    expect(out).toContain("[abs](https://a.test/)");
  });
});

describe("rewriteLinks unsafe schemes", () => {
  it("neutralizes javascript: and data: links but keeps mailto", () => {
    const ctx = { fromPath: "a/README.md", repoUrl: "https://github.com/o/r", commit: "abcdef1", track: "t", entries: [] };
    const md = "[x](javascript:alert(1)) [y](data:text/html,1) [m](mailto:a@b.c)";
    const out = stringifyMdx(rewriteLinks(parseMarkdown(md), ctx));
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:");
    expect(out).toContain("[m](mailto:a@b.c)");
  });
});

describe("sanitizeSvg", () => {
  it("defeats common regex bypasses", () => {
    const svg = '<svg/onload=alert(1)><scr<script></script>ipt>x</script><a href=javascript:alert(1)>t</a><foreignObject><iframe src="https://e.test"></iframe></foreignObject><use href="#ok"/></svg>';
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain("javascript:");
    expect(out).not.toMatch(/foreignObject|iframe/i);
    expect(out).toContain('href="#ok"');
  });

  it("strips scripts, event handlers and external hrefs but keeps local refs", () => {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" onload="evil()">',
      "<script>alert(1)</script>",
      '<a href="https://evil.test" xlink:href="javascript:alert(1)"><text onclick="x()">t</text></a>',
      '<path marker-end="url(#arrow)" d="M0 0"/>',
      '<use href="#arrow"/>',
      "</svg>",
    ].join("\n");
    const out = sanitizeSvg(svg);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/\son\w+=/i);
    expect(out).not.toContain("evil.test");
    expect(out).not.toContain("javascript:");
    expect(out).toContain('href="#arrow"');
    expect(out).toContain('marker-end="url(#arrow)"');
  });
});
