import type { Root } from "mdast";
import { withChildren } from "./tree";

/**
 * Drops thematic breaks (`---`) at the very start of the body. A rule right
 * after the frontmatter is meaningless and some frontmatter parsers mistake it
 * for a second metadata block.
 */
export function stripLeadingRules(tree: Root): Root {
  const children = tree.children;
  let index = 0;
  while (index < children.length && children[index]?.type === "thematicBreak") index += 1;
  return index === 0 ? tree : withChildren(tree, children.slice(index));
}
