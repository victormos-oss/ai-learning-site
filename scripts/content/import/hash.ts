import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".md", ".mdx", ".py", ".svg", ".txt", ".json", ".yaml", ".yml",
  ".ts", ".js", ".sh", ".toml", ".cfg", ".csv", ".html", ".css",
]);

export function isTextFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function normalizeNewlines(text: string): string {
  return text.replaceAll("\r\n", "\n");
}

export function sha256(data: string | Buffer): string {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

/** Text files are hashed after CRLF -> LF so Windows checkouts agree with Linux. */
export function hashContent(content: Buffer, filePath: string): string {
  return isTextFile(filePath) ? sha256(normalizeNewlines(content.toString("utf8"))) : sha256(content);
}

export function hashFile(absolutePath: string): string {
  return hashContent(readFileSync(absolutePath), absolutePath);
}
