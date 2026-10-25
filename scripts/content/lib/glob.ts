import { readdirSync, statSync } from "node:fs";
import { posix } from "node:path";

const REGEXP_SPECIALS = /[.+^${}()|\\]/;

function escapeChar(ch: string): string {
  return REGEXP_SPECIALS.test(ch) ? `\\${ch}` : ch;
}

function appendStar(pattern: string, index: number): { text: string; next: number } {
  if (pattern[index + 1] !== "*") return { text: "[^/]*", next: index };
  // `**/` matches zero or more directories; a trailing `**` matches the rest.
  const slashFollows = pattern[index + 2] === "/";
  return {
    text: slashFollows ? "(?:.*/)?" : ".*",
    next: slashFollows ? index + 2 : index + 1,
  };
}

function appendBracket(pattern: string, index: number): { text: string; next: number } {
  const end = pattern.indexOf("]", index);
  if (end === -1) return { text: "\\[", next: index };
  return { text: pattern.slice(index, end + 1), next: end };
}

/** Converts a glob (`**`, `*`, `?`, `[...]`) into an anchored RegExp over posix paths. */
export function globToRegExp(pattern: string): RegExp {
  const parts: string[] = ["^"];
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i] ?? "";
    if (ch === "*") {
      const star = appendStar(pattern, i);
      parts.push(star.text);
      i = star.next;
    } else if (ch === "?") {
      parts.push("[^/]");
    } else if (ch === "[") {
      const bracket = appendBracket(pattern, i);
      parts.push(bracket.text);
      i = bracket.next;
    } else {
      parts.push(escapeChar(ch));
    }
  }
  parts.push("$");
  return new RegExp(parts.join(""));
}

export function matchesGlob(path: string, pattern: string): boolean {
  return globToRegExp(pattern).test(path);
}

export function matchesAnyGlob(path: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => matchesGlob(path, pattern));
}

/** Leading path segments of a pattern that contain no glob characters. */
export function staticPrefix(pattern: string): string {
  const segments = pattern.split("/");
  const fixed: string[] = [];
  for (const segment of segments) {
    if (/[*?[]/.test(segment)) break;
    fixed.push(segment);
  }
  return fixed.join("/");
}

/** Symlinks and dot-folders (`.git`) are skipped: upstream is untrusted. */
function walkFiles(rootDir: string, relativeDir: string): string[] {
  const absolute = relativeDir ? posix.join(rootDir, relativeDir) : rootDir;
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink() || entry.name.startsWith(".")) return [];
    const relative = relativeDir ? posix.join(relativeDir, entry.name) : entry.name;
    if (entry.isDirectory()) return walkFiles(rootDir, relative);
    return entry.isFile() ? [relative] : [];
  });
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Expands a glob relative to `rootDir`; returns sorted posix paths relative to `rootDir`. */
export function expandGlob(rootDir: string, pattern: string): string[] {
  const root = rootDir.replaceAll("\\", "/");
  const prefix = staticPrefix(pattern);
  const start = prefix ? posix.join(root, prefix) : root;
  if (!isDirectory(start)) return [];
  const regexp = globToRegExp(pattern);
  return walkFiles(root, prefix)
    .filter((file) => regexp.test(file))
    .sort();
}
