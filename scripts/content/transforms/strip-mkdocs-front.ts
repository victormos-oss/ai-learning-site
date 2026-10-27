import type { Paragraph, PhrasingContent, Root, RootContent } from "mdast";
import {
  filterRootChildren,
  findSection,
  isParagraph,
  nodeText,
  withChildren,
} from "./tree";

/** `---\n...\n---\n` at the very start of the file (mkdocs `hide:`, `title:` and so on). */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n(?:\r?\n)*/;
/** First non-empty line of a yaml mapping: `key:` or `key: value`. */
const YAML_KEY = /^[\w-]+\s*:/;
/** Material icon shortcodes such as `:octicons-arrow-left-24:` or `:material-check:`. */
const ICON_SHORTCODE = /:[a-z]+(?:-[a-z0-9]+)+:/i;
/** Attribute lists such as `{ .md-button .md-button--primary }` or `{: #id }`. */
const ATTR_LIST = /\{:?\s*[.#][^}]*\}/;
const SEPARATORS_ONLY = /^[\s·|•/]*$/;
const SEE_ALSO = /^see also$/i;
const WHATS_NEXT = /^(what'?s next|next steps)$/i;

/**
 * Drops a yaml frontmatter block the upstream site generator needed; the import
 * writes its own. A file that merely opens with a thematic break (`---` followed
 * by prose) is left alone, otherwise its title and intro would vanish.
 */
export function stripMkdocsFrontmatter(markdown: string): string {
  const match = FRONTMATTER.exec(markdown);
  if (!match) return markdown;
  const firstLine = (match[1] ?? "").split(/\r?\n/).find((line) => line.trim() !== "");
  if (!firstLine || !YAML_KEY.test(firstLine)) return markdown;
  return markdown.slice(match[0].length);
}

function isSeparatorText(child: PhrasingContent): boolean {
  return child.type === "text" && SEPARATORS_ONLY.test(child.value);
}

/**
 * Navigation footer of the Material theme: a paragraph made only of links
 * (plus separators) where a link carries an icon shortcode or an attribute list follows.
 */
export function isMaterialNav(paragraph: Paragraph): boolean {
  const text = nodeText(paragraph);
  const themed = ICON_SHORTCODE.test(text) || ATTR_LIST.test(text);
  if (!themed) return false;
  return paragraph.children.every(
    (child) =>
      child.type === "link" ||
      isSeparatorText(child) ||
      (child.type === "text" && ATTR_LIST.test(child.value)),
  );
}

export function stripMaterialNav(tree: Root): Root {
  return filterRootChildren(tree, (node) => !(isParagraph(node) && isMaterialNav(node)));
}

export interface SeeAlsoSplit {
  tree: Root;
  /** Nodes of the "See Also" section without its heading; empty when absent. */
  seeAlso: RootContent[];
}

/**
 * Detaches the trailing "See Also" section so callers can drop it (appended
 * documents) or move it behind appended material (the main document).
 */
export function splitSeeAlso(tree: Root): SeeAlsoSplit {
  const section = findSection(tree, (heading) => SEE_ALSO.test(nodeText(heading).trim()));
  if (!section || section.end !== tree.children.length) return { tree, seeAlso: [] };
  const start = leadInStart(tree.children, section.start);
  return {
    tree: withChildren(tree, tree.children.slice(0, start)),
    seeAlso: [
      ...tree.children
        .slice(start, section.start)
        .filter((node) => node.type !== "heading"),
      ...tree.children.slice(section.start + 1),
    ],
  };
}

/**
 * A "What's Next" section that only introduces the See Also list (one
 * paragraph without links) is folded into it, so no heading dangles.
 */
function leadInStart(children: readonly RootContent[], seeAlsoAt: number): number {
  const headingAt = seeAlsoAt - 2;
  const heading = children[headingAt];
  const paragraph = children[seeAlsoAt - 1];
  if (!heading || heading.type !== "heading" || !paragraph || !isParagraph(paragraph)) {
    return seeAlsoAt;
  }
  const isLeadIn =
    WHATS_NEXT.test(nodeText(heading).trim()) &&
    paragraph.children.every((child) => child.type !== "link");
  return isLeadIn ? headingAt : seeAlsoAt;
}

/** Rebuilds the heading that `splitSeeAlso` removed. */
export function seeAlsoHeading(): RootContent {
  return { type: "heading", depth: 2, children: [{ type: "text", value: "See Also" }] };
}
