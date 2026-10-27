import type { Code, Paragraph, Root, RootContent } from "mdast";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { parseMarkdown } from "../lib/mdast";
import { isParagraph, jsxElement, nodeText, withChildren } from "./tree";

export type CalloutKind = "note" | "tip" | "warning";

/** `!!! note "Title"` or `??? tip` / `???+ tip` (collapsible) on its own line. */
const ADMONITION_HEAD = /^(?:!!!|\?\?\?\+?)\s+([A-Za-z][\w-]*)(?:\s+"([^"]*)")?\s*$/;

const KIND_BY_TYPE: Readonly<Record<string, CalloutKind>> = {
  note: "note",
  info: "note",
  abstract: "note",
  summary: "note",
  tldr: "note",
  example: "note",
  quote: "note",
  tip: "tip",
  hint: "tip",
  success: "tip",
  check: "tip",
  done: "tip",
  question: "tip",
  warning: "warning",
  caution: "warning",
  attention: "warning",
  danger: "warning",
  error: "warning",
  failure: "warning",
  fail: "warning",
  bug: "warning",
};

/** Maps a Material for MkDocs admonition type onto the three Callout kinds; unknown types read as notes. */
export function admonitionKind(type: string): CalloutKind {
  return KIND_BY_TYPE[type.toLowerCase()] ?? "note";
}

interface AdmonitionHead {
  kind: CalloutKind;
  title: string;
  /** Lazy continuation lines that remark glued into the head paragraph. */
  inlineBody: string;
}

function parseHead(paragraph: Paragraph): AdmonitionHead | undefined {
  const [first = "", ...rest] = nodeText(paragraph).split("\n");
  const match = ADMONITION_HEAD.exec(first);
  if (!match) return undefined;
  const type = match[1]!;
  const title = match[2] ?? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return { kind: admonitionKind(type), title, inlineBody: rest.join("\n") };
}

/** An indented block right after the head is admonition content, parsed as an unnamed code node. */
function isIndentedBody(node: RootContent | undefined): node is Code {
  return node?.type === "code" && !node.lang && !node.meta;
}

function bodyNodes(head: AdmonitionHead, indented: Code | undefined): RootContent[] {
  const parts = [head.inlineBody, indented?.value ?? ""].filter((part) => part.trim());
  return parseMarkdown(parts.join("\n\n")).children;
}

function calloutNode(head: AdmonitionHead, children: RootContent[]): RootContent {
  const attributes: Record<string, string> = head.title
    ? { kind: head.kind, title: head.title }
    : { kind: head.kind };
  const element = jsxElement("Callout", attributes) as MdxJsxFlowElement;
  return { ...element, children } as unknown as RootContent;
}

/**
 * Rewrites Material for MkDocs admonitions into `<Callout kind title>` blocks.
 * Only top-level admonitions are handled; the lesson pages have no nested ones.
 */
export function mkdocsAdmonitions(tree: Root): Root {
  const children = tree.children.reduce<RootContent[]>((acc, node, index, all) => {
    const previous = all[index - 1];
    if (
      isIndentedBody(node) &&
      previous &&
      isParagraph(previous) &&
      parseHead(previous)
    ) {
      return acc;
    }
    if (!isParagraph(node)) return [...acc, node];
    const head = parseHead(node);
    if (!head) return [...acc, node];
    const next = all[index + 1];
    const body = bodyNodes(head, isIndentedBody(next) ? next : undefined);
    return [...acc, calloutNode(head, body)];
  }, []);
  return withChildren(tree, children);
}
