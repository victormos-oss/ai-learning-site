import type { Root, RootContent } from "mdast";
import { posix } from "node:path";
import { findSection, jsxElement, nodeText, withChildren } from "./tree";

const TRY_IT_HEADING = /^(try it|try it out|run it|running it|try this)\b/i;

/**
 * Appends `<CodeFile src="code.py" />` at the end of the "Try It" / "Run it"
 * section, or at the end of the document when no such section exists.
 */
export function inlineCodeFile(tree: Root, codeFile: string | undefined): Root {
  if (!codeFile) return tree;
  const element = jsxElement("CodeFile", {
    src: posix.basename(codeFile),
  }) as RootContent;
  const section = findSection(tree, (heading) =>
    TRY_IT_HEADING.test(nodeText(heading).trim()),
  );
  const end = section ? section.end : tree.children.length;
  // Upstream separates sections with `---`; keep the code inside the section.
  const at = tree.children[end - 1]?.type === "thematicBreak" ? end - 1 : end;
  return withChildren(tree, [
    ...tree.children.slice(0, at),
    element,
    ...tree.children.slice(at),
  ]);
}
