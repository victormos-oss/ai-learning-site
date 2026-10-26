import type { Paragraph, Root } from "mdast";
import { filterRootChildren, isParagraph } from "./tree";

const README_LINK = /(^|\/)README(\.[a-zA-Z-]+)?\.md$/;
const SEPARATORS_ONLY = /^[\s·|•/]*$/;

/**
 * Language switcher such as `[English](README.md) · [中文](README.zh.md)`:
 * two or more links to README variants separated only by punctuation.
 */
export function isLangBar(paragraph: Paragraph): boolean {
  const links = paragraph.children.filter((child) => child.type === "link");
  if (links.length < 2) return false;
  const onlyReadmeLinks = links.every((link) => README_LINK.test(link.url));
  const onlySeparators = paragraph.children.every(
    (child) =>
      child.type === "link" ||
      (child.type === "text" && SEPARATORS_ONLY.test(child.value)),
  );
  return onlyReadmeLinks && onlySeparators;
}

export function stripLangBar(tree: Root): Root {
  return filterRootChildren(tree, (node) => !(isParagraph(node) && isLangBar(node)));
}
