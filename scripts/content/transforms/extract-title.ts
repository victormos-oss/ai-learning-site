import type { Root } from "mdast";
import { isHeading, isParagraph, nodeText, withChildren } from "./tree";

const SECTION_PREFIX = /^s\d{2}\s*[:.]\s*/i;
const DASH_SEPARATOR = /\s+[—–]\s+/;
const COLON_SEPARATOR = /:\s+/;
const LONG_DASH = /\s*[—–]\s*/g;
const SUMMARY_MAX = 400;

export interface ParsedTitle {
  title: string;
  subtitle?: string;
}

export interface TitleResult {
  tree: Root;
  title: string;
  summary: string;
}

/** Long dashes are not allowed in titles and summaries; a comma reads naturally. */
export function replaceLongDashes(text: string): string {
  return text.replace(LONG_DASH, ", ").trim();
}

function splitOnce(text: string, separator: RegExp): [string, string | undefined] {
  const match = separator.exec(text);
  if (!match) return [text, undefined];
  return [text.slice(0, match.index), text.slice(match.index + match[0].length)];
}

/** `s01: The Agent Loop — One Loop Is All You Need` -> title + subtitle. */
export function parseTitle(raw: string): ParsedTitle {
  const withoutPrefix = raw.trim().replace(SECTION_PREFIX, "");
  const [byDash, dashRest] = splitOnce(withoutPrefix, DASH_SEPARATOR);
  const [title, subtitle] =
    dashRest === undefined ? splitOnce(byDash, COLON_SEPARATOR) : [byDash, dashRest];
  const cleanSubtitle = subtitle ? replaceLongDashes(subtitle) : undefined;
  return cleanSubtitle
    ? { title: replaceLongDashes(title), subtitle: cleanSubtitle }
    : { title: replaceLongDashes(title) };
}

function truncate(text: string): string {
  if (text.length <= SUMMARY_MAX) return text;
  return `${text.slice(0, SUMMARY_MAX - 1).trimEnd()}…`;
}

function firstParagraphText(tree: Root): string | undefined {
  const paragraph = tree.children.find(
    (node) =>
      isParagraph(node) && !node.children.every((child) => child.type === "image"),
  );
  return paragraph ? nodeText(paragraph) : undefined;
}

/** Extracts title and summary from the first H1 and removes that H1 from the body. */
export function extractTitle(tree: Root): TitleResult {
  const index = tree.children.findIndex((node) => isHeading(node, 1));
  if (index === -1) throw new Error("Lesson source has no H1 heading");
  const parsed = parseTitle(nodeText(tree.children[index]!));
  const body = withChildren(
    tree,
    tree.children.filter((_, i) => i !== index),
  );
  const summary = parsed.subtitle ?? firstParagraphText(body) ?? parsed.title;
  return {
    tree: body,
    title: parsed.title,
    summary: truncate(replaceLongDashes(summary)),
  };
}
