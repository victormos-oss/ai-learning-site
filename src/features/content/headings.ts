import GithubSlugger from "github-slugger";
import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type LessonHeading = { depth: 2 | 3; text: string; id: string };

/**
 * Collects h2/h3 headings from the markdown tree, so code fences and inline
 * markup never produce phantom entries. Ids follow rehype-slug (github-slugger)
 * with the same duplicate handling, so table-of-contents anchors always match.
 */
export function collectHeadings(markdown: string): LessonHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
  const slugger = new GithubSlugger();
  const headings: LessonHeading[] = [];
  visit(tree, "heading", (node: Heading) => {
    if (node.depth !== 2 && node.depth !== 3) return;
    const text = toString(node).trim();
    if (!text) return;
    headings.push({ depth: node.depth, text, id: slugger.slug(text) });
  });
  return headings;
}
