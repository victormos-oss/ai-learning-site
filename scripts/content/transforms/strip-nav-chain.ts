import type { Root } from "mdast";
import { filterRootChildren, isParagraph, nodeText } from "./tree";

const ARROW = /→|->/;
const CHAIN_TOKENS = /s\d{2}|→|->|\.\.\.|…|\s/g;

/**
 * Navigation chain such as `s01 → [s02](../s02_tool_use/) → s03 → ... → s17`:
 * after removing section ids, arrows and ellipses nothing is left.
 */
export function isNavChain(text: string): boolean {
  if (!ARROW.test(text)) return false;
  return text.replace(CHAIN_TOKENS, "").length === 0;
}

export function stripNavChain(tree: Root): Root {
  return filterRootChildren(tree, (node) => !(isParagraph(node) && isNavChain(nodeText(node))));
}
