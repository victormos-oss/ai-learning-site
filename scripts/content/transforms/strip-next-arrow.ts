import type { Root } from "mdast";
import { filterRootChildren, isParagraph, nodeText } from "./tree";

/** Teaser lines such as `→ s02 Tool Use: What happens when ...` in "What's Next". */
const NEXT_ARROW = /^(→|->)\s*s\d{2}\b/;

export function isNextArrow(text: string): boolean {
  return NEXT_ARROW.test(text.trim());
}

export function stripNextArrow(tree: Root): Root {
  return filterRootChildren(tree, (node) => !(isParagraph(node) && isNextArrow(nodeText(node))));
}
