import type { Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Lesson MDX may only use the components in the allow-list, with literal
 * attribute values. Expressions, ESM and unknown elements fail the build, so
 * translated or hand-edited content cannot smuggle arbitrary JSX.
 */
export const LESSON_COMPONENT_NAMES = [
  "Callout",
  "DocQuote",
  "Figure",
  "CodeFile",
] as const;

const ALLOWED = new Set<string>(LESSON_COMPONENT_NAMES);
const FORBIDDEN_NODE_TYPES = new Set([
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxTextExpression",
]);
const JSX_NODE_TYPES = new Set(["mdxJsxFlowElement", "mdxJsxTextElement"]);

type JsxAttribute = {
  type: string;
  name?: string;
  value?: unknown;
};

type JsxNode = {
  type: string;
  name?: string | null;
  attributes?: JsxAttribute[];
  position?: { start?: { line?: number } };
};

function describe(node: JsxNode): string {
  const line = node.position?.start?.line;
  return line ? `line ${line}` : "unknown position";
}

function checkJsx(node: JsxNode): void {
  if (!node.name || !ALLOWED.has(node.name)) {
    throw new Error(
      `MDX guard: element <${node.name ?? "fragment"}> is not allowed (${describe(node)}). ` +
        `Allowed: ${[...ALLOWED].join(", ")}.`,
    );
  }
  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== "mdxJsxAttribute") {
      throw new Error(
        `MDX guard: spread attributes are not allowed on <${node.name}> (${describe(node)}).`,
      );
    }
    if (attribute.value && typeof attribute.value === "object") {
      throw new Error(
        `MDX guard: attribute "${attribute.name}" on <${node.name}> must be a literal (${describe(node)}).`,
      );
    }
  }
}

export default function remarkGuard() {
  return (tree: Root) => {
    visit(tree, (node) => {
      const candidate = node as unknown as JsxNode;
      if (FORBIDDEN_NODE_TYPES.has(candidate.type)) {
        throw new Error(
          `MDX guard: ${candidate.type} is not allowed in lessons (${describe(candidate)}).`,
        );
      }
      if (JSX_NODE_TYPES.has(candidate.type)) checkJsx(candidate);
    });
  };
}
