import type { Image, Paragraph, Root } from "mdast";
import { posix } from "node:path";
import type { Node } from "unist";
import { jsxElement, mapTree } from "./tree";

/** An upstream image chosen for the lesson and where it lands in the lesson folder. */
export interface AssetRef {
  /** File stem without locale and extension, used as `<Figure src>`. */
  base: string;
  /** Path relative to the upstream section folder, e.g. `images/agent-loop.en.svg`. */
  file: string;
  /** Path relative to the lesson folder, e.g. `assets/agent-loop.en.svg`. */
  target: string;
}

export interface ImageRewriteResult {
  tree: Root;
  assets: AssetRef[];
  warnings: string[];
}

const EXTERNAL = /^[a-z][a-z0-9+.-]*:|^\/\//i;
const LOCALE_SUFFIX = /\.[a-z]{2}(-[A-Za-z]+)?$/;

function splitImageUrl(url: string): { dir: string; base: string; ext: string } {
  const ext = posix.extname(url);
  const stem = posix.basename(url, ext);
  return { dir: posix.dirname(url), base: stem.replace(LOCALE_SUFFIX, ""), ext };
}

/** `.en` variant first, then the file without a locale suffix. */
function chooseFile(url: string, available: ReadonlySet<string>): AssetRef | undefined {
  const { dir, base, ext } = splitImageUrl(url);
  const candidates = [`${base}.en${ext}`, `${base}${ext}`].map((name) => posix.join(dir, name));
  const file = candidates.find((candidate) => available.has(candidate));
  return file ? { base, file, target: `assets/${base}.en${ext}` } : undefined;
}

function isLocalImage(node: Node): node is Image {
  return node.type === "image" && !EXTERNAL.test((node as Image).url);
}

function isImageOnlyParagraph(node: Node): node is Paragraph {
  if (node.type !== "paragraph") return false;
  const children = (node as Paragraph).children;
  return children.length === 1 && isLocalImage(children[0]!);
}

/**
 * Replaces `![alt](images/x.en.svg)` with `<Figure src="x" alt="alt" />`.
 * `availableFiles` are upstream paths relative to the section folder.
 */
export function rewriteImages(tree: Root, availableFiles: readonly string[]): ImageRewriteResult {
  const available = new Set(availableFiles.map((file) => file.replaceAll("\\", "/")));
  const assets = new Map<string, AssetRef>();
  const warnings: string[] = [];

  const figureFor = (image: Image, flow: boolean): Node | undefined => {
    const chosen = chooseFile(image.url, available);
    if (!chosen) {
      warnings.push(`image "${image.url}" has no matching upstream file`);
      return undefined;
    }
    assets.set(chosen.base, chosen);
    const type = flow ? "mdxJsxFlowElement" : "mdxJsxTextElement";
    return jsxElement("Figure", { src: chosen.base, alt: image.alt ?? "" }, type);
  };

  // Returning the node itself keeps it and stops the descent, so an
  // unresolved image inside a paragraph is reported only once.
  const mapped = mapTree(tree, (node) => {
    if (isImageOnlyParagraph(node)) return figureFor(node.children[0] as Image, true) ?? node;
    if (isLocalImage(node)) return figureFor(node, false) ?? node;
    return undefined;
  });
  return { tree: mapped, assets: [...assets.values()], warnings };
}
