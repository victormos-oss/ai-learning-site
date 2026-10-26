import type { Heading, Paragraph, Root, RootContent } from "mdast";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { toString } from "mdast-util-to-string";
import type { Node, Parent } from "unist";

/**
 * Result of visiting a node while rebuilding a tree:
 * `null` drops the node, a node replaces it (and is not descended into),
 * `undefined` keeps the node and descends into its children.
 */
export type NodeMapper = (node: Node, parent: Parent) => Node | null | undefined;

function hasChildren(node: Node): node is Parent {
  return Array.isArray((node as Parent).children);
}

function mapChild(child: Node, parent: Parent, mapper: NodeMapper): Node[] {
  const mapped = mapper(child, parent);
  if (mapped === null) return [];
  if (mapped !== undefined) return [mapped];
  return [mapTree(child, mapper)];
}

/** Returns a new tree; the input is never mutated. The root itself is not passed to the mapper. */
export function mapTree<T extends Node>(tree: T, mapper: NodeMapper): T {
  if (!hasChildren(tree)) return tree;
  const children = tree.children.flatMap((child) => mapChild(child, tree, mapper));
  return { ...tree, children } as T;
}

/** Plain text of a node, with inline code and links flattened. */
export function nodeText(node: Node): string {
  return toString(node);
}

export function isHeading(node: Node, depth?: number): node is Heading {
  return (
    node.type === "heading" && (depth === undefined || (node as Heading).depth === depth)
  );
}

export function isParagraph(node: Node): node is Paragraph {
  return node.type === "paragraph";
}

export function withChildren(tree: Root, children: RootContent[]): Root {
  return { ...tree, children };
}

export function filterRootChildren(
  tree: Root,
  keep: (node: RootContent) => boolean,
): Root {
  return withChildren(tree, tree.children.filter(keep));
}

type JsxElementType = "mdxJsxFlowElement" | "mdxJsxTextElement";

/** Builds a self-closing JSX element node such as `<Figure src="x" alt="y" />`. */
export function jsxElement(
  name: string,
  attributes: Readonly<Record<string, string>>,
  type: JsxElementType = "mdxJsxFlowElement",
): MdxJsxFlowElement | MdxJsxTextElement {
  return {
    type,
    name,
    attributes: Object.entries(attributes).map(([key, value]) => ({
      type: "mdxJsxAttribute" as const,
      name: key,
      value,
    })),
    children: [],
  } as MdxJsxFlowElement | MdxJsxTextElement;
}

/**
 * Index range `[start, end)` of the section opened by the first top-level
 * heading matching `matches`; the section ends at the next heading of the
 * same or higher level. Returns `undefined` when no heading matches.
 */
export function findSection(
  tree: Root,
  matches: (heading: Heading) => boolean,
): { start: number; end: number } | undefined {
  const start = tree.children.findIndex((node) => isHeading(node) && matches(node));
  if (start === -1) return undefined;
  const depth = (tree.children[start] as Heading).depth;
  const rest = tree.children.slice(start + 1);
  const offset = rest.findIndex((node) => isHeading(node) && node.depth <= depth);
  return { start, end: offset === -1 ? tree.children.length : start + 1 + offset };
}
