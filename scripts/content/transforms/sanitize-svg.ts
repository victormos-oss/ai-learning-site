/*
 * Regex-based SVG filter for upstream assets. Element names may carry an XML
 * namespace prefix (`<s:script>` is still a script once the SVG namespace is
 * bound), so every element pattern accepts an optional `prefix:`.
 */
const NS = String.raw`(?:[\w.-]+:)?`;

const SCRIPT_BLOCK = new RegExp(
  String.raw`<${NS}script\b[^>]*>[\s\S]*?(<\/${NS}script\s*>|$)`,
  "gi",
);
const SCRIPT_SELF_CLOSING = new RegExp(String.raw`<${NS}script\b[^>]*\/>`, "gi");
/** Elements that embed HTML or external content: dropped with their whole content. */
const EMBEDDING_BLOCK = new RegExp(
  String.raw`<${NS}(foreignObject|iframe|embed|object|style)\b[^>]*>[\s\S]*?<\/${NS}\1\s*>`,
  "gi",
);
/** Any stray opening, closing or self-closing tag of a disallowed element (animate* can set javascript: hrefs). */
const DISALLOWED_TAG = new RegExp(
  String.raw`<\/?${NS}(foreignObject|iframe|embed|object|style|animate|animateMotion|animateTransform|set|handler)\b[^>]*\/?>`,
  "gi",
);
/** `onload="..."`, `onload='...'`, `onload=x`, also after `/` as in `<svg/onload=...>` and with a prefix. */
const EVENT_HANDLER = /[\s/](?:[\w-]+:)?on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
/** `href` / `xlink:href` whose value is not a local `#id` reference, quoted or not. */
const EXTERNAL_HREF =
  /[\s/](?:[\w-]+:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*'|(?!["'#])[^\s>]+)/gi;
/** Inline `style` attributes that load anything through `url(...)`. */
const STYLE_WITH_URL =
  /[\s/]style\s*=\s*("[^"]*url\s*\([^"]*"|'[^']*url\s*\([^']*'|[^\s>"']*url\s*\([^\s>]*)/gi;

const MAX_PASSES = 5;

function sanitizeOnce(svg: string): string {
  return svg
    .replace(SCRIPT_BLOCK, "")
    .replace(SCRIPT_SELF_CLOSING, "")
    .replace(EMBEDDING_BLOCK, "")
    .replace(DISALLOWED_TAG, "")
    .replace(EVENT_HANDLER, "")
    .replace(EXTERNAL_HREF, "")
    .replace(STYLE_WITH_URL, "");
}

/**
 * Makes an upstream SVG safe enough to copy into the lesson assets: no
 * scripts, event handlers, embedded HTML or external links. Local references
 * (`#arrow`) are kept so markers and `<use>` keep working. Passes repeat until
 * the output is stable so nested payloads cannot reassemble.
 *
 * This is a regex filter, not a parser; the site still serves SVGs via
 * `<img src>` and a sandboxing CSP on /content rather than inlining them.
 */
export function sanitizeSvg(svg: string): string {
  let current = svg;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    const next = sanitizeOnce(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}

/** Text that looks like an SVG document regardless of file extension. */
export function looksLikeSvg(content: Buffer): boolean {
  const head = content.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
}
