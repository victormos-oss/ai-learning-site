import type { Html, Root, Text } from "mdast";
import type { Node } from "unist";
import { mapTree } from "./tree";

const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/**
 * Drops `<!-- ... -->` (MDX cannot compile them). Any raw HTML that remains
 * becomes literal text, which the MDX serializer escapes, because MDX would
 * otherwise read it as JSX.
 */
function mapHtmlNode(node: Node): Node | null | undefined {
  if (node.type !== "html") return undefined;
  const value = (node as Html).value.replace(HTML_COMMENT, "").trim();
  if (value.length === 0) return null;
  const text: Text = { type: "text", value };
  return text;
}

function dropEmptyParagraphs(node: Node): Node | null | undefined {
  if (node.type !== "paragraph") return undefined;
  const paragraph = node as Root["children"][number] & { children: Node[] };
  return paragraph.children.length === 0 ? null : undefined;
}

export function stripHtmlComments(tree: Root): Root {
  return mapTree(mapTree(tree, mapHtmlNode), dropEmptyParagraphs);
}
