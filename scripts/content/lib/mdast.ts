import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

/**
 * Upstream READMEs are plain GitHub Markdown, so they are parsed without the
 * MDX extension: `{`, `<` and friends must stay literal text here.
 */
export function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

/**
 * Serializes an mdast tree as MDX. remark-mdx registers the JSX node handlers
 * and the extra escapes (`\{`, `\<`) that keep literal text safe for MDX.
 */
export function stringifyMdx(tree: Root): string {
  return unified()
    .use(remarkGfm)
    .use(remarkMdx)
    .use(remarkStringify, {
      bullet: "-",
      emphasis: "*",
      strong: "*",
      fences: true,
      rule: "-",
      listItemIndent: "one",
    })
    .stringify(tree);
}
