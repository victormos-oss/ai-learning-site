import type { Heading, Root, RootContent } from "mdast";
import { posix } from "node:path";
import type { Node } from "unist";
import { mapTree, withChildren } from "./tree";

const MAX_DEPTH = 6;

export interface ExtraSection {
  /** Text of the H2 that opens the appended material. */
  heading: string;
  /** Cleaned body of the extra document, H1 already removed. */
  tree: Root;
}

/** `guides/cost-management.md` -> `Cost Management`. */
export function headingFromFileName(filePath: string): string {
  const stem = posix.basename(filePath, posix.extname(filePath));
  return stem
    .split(/[-_\s]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function demoteHeadings(tree: Root): Root {
  return mapTree(tree, (node: Node) => {
    if (node.type !== "heading") return undefined;
    const heading = node as Heading;
    const depth = Math.min(MAX_DEPTH, heading.depth + 1) as Heading["depth"];
    return depth === heading.depth ? undefined : { ...heading, depth };
  });
}

function sectionNodes(extra: ExtraSection): RootContent[] {
  const heading: Heading = {
    type: "heading",
    depth: 2,
    children: [{ type: "text", value: extra.heading }],
  };
  return [heading, ...demoteHeadings(extra.tree).children];
}

/**
 * Appends extra documents after the main body: each one opens with an H2
 * named after its file and has its own headings pushed one level down.
 */
export function appendExtras(main: Root, extras: readonly ExtraSection[]): Root {
  if (extras.length === 0) return main;
  return withChildren(main, [...main.children, ...extras.flatMap(sectionNodes)]);
}
