import type { Link, Root } from "mdast";
import { posix } from "node:path";
import type { Node } from "unist";
import { entryDir, entryFiles, type MappingEntry } from "../lib/mapping-schema";
import { mapTree } from "./tree";

export interface LinkContext {
  /** Path of the file being transformed, relative to the clone root. */
  fromPath: string;
  /** Repository URL without trailing slash, e.g. `https://github.com/owner/repo`. */
  repoUrl: string;
  commit: string;
  track: string;
  entries: readonly MappingEntry[];
}

const ABSOLUTE = /^[a-z][a-z0-9+.-]*:|^\/\//i;
/** Only these schemes may reach the MDX; `javascript:`, `data:` and friends are neutralized. */
const SAFE_SCHEME = /^(https?:|mailto:|\/\/)/i;
const UNSAFE_PLACEHOLDER = "#unsafe-link-removed";

function splitHash(url: string): { path: string; hash: string } {
  const at = url.indexOf("#");
  return at === -1
    ? { path: url, hash: "" }
    : { path: url.slice(0, at), hash: url.slice(at) };
}

/** Normalizes `../s02_tool_use/README.md` into the section folder `s02_tool_use`. */
function resolveRelative(
  fromPath: string,
  target: string,
): { path: string; isDir: boolean } {
  const joined = posix.normalize(posix.join(posix.dirname(fromPath), target));
  const isDir = target.endsWith("/") || posix.extname(joined) === "";
  const path = joined.replace(/\/$/, "");
  return { path: path === "." ? "" : path, isDir };
}

/** Lessons built from a folder README own the whole folder as a link target. */
function isReadmeLesson(entry: MappingEntry): boolean {
  return posix.basename(entry.from) === "README.md";
}

/**
 * A link to a file some lesson is built from (`from` or `alsoFrom`), or to a
 * section folder of a README-based lesson, becomes that lesson's route.
 */
function internalRoute(ctx: LinkContext, path: string): string | undefined {
  const byFile = ctx.entries.find((candidate) => entryFiles(candidate).includes(path));
  const sectionDir = path.endsWith("/README.md") ? posix.dirname(path) : path;
  const entry =
    byFile ??
    ctx.entries.find(
      (candidate) => isReadmeLesson(candidate) && entryDir(candidate) === sectionDir,
    );
  return entry ? `/tracks/${ctx.track}/${entry.slug}` : undefined;
}

function githubUrl(ctx: LinkContext, path: string, isDir: boolean): string {
  const kind = isDir ? "tree" : "blob";
  return path
    ? `${ctx.repoUrl}/${kind}/${ctx.commit}/${path}`
    : `${ctx.repoUrl}/tree/${ctx.commit}`;
}

export function rewriteUrl(url: string, ctx: LinkContext): string {
  if (ABSOLUTE.test(url)) return SAFE_SCHEME.test(url) ? url : UNSAFE_PLACEHOLDER;
  if (url.startsWith("#") || url.trim() === "") return url;
  const { path, hash } = splitHash(url);
  const resolved = resolveRelative(ctx.fromPath, path);
  const internal = internalRoute(ctx, resolved.path);
  return `${internal ?? githubUrl(ctx, resolved.path, resolved.isDir)}${hash}`;
}

/**
 * Sibling sections become internal lesson routes; every other relative link
 * points at GitHub on the pinned commit. Anchors and absolute URLs stay.
 */
export function rewriteLinks(tree: Root, ctx: LinkContext): Root {
  return mapTree(tree, (node: Node) => {
    if (node.type !== "link" && node.type !== "definition") return undefined;
    const link = node as Link;
    const url = rewriteUrl(link.url, ctx);
    // Children are left as shared, never-mutated references.
    return url === link.url ? undefined : { ...link, url };
  });
}
