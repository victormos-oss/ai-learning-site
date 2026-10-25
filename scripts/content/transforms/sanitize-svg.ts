const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?(<\/script\s*>|$)/gi;
const SCRIPT_SELF_CLOSING = /<script\b[^>]*\/>/gi;
/** Elements that can embed HTML, external content or animate attributes into `javascript:`. */
const EMBEDDING_ELEMENTS = /<(foreignObject|iframe|embed|object|style|animate|set|handler)\b[^>]*>[\s\S]*?(<\/\1\s*>|(?=<)|$)/gi;
/** `onload="..."`, `onload='...'`, `onload=x`, also after `/` as in `<svg/onload=...>`. */
const EVENT_HANDLER = /[\s/]on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
/** `href` / `xlink:href` whose value is not a local `#id` reference, quoted or not. */
const EXTERNAL_HREF = /[\s/](?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*'|(?!["'#])[^\s>]+)/gi;

const MAX_PASSES = 5;

function sanitizeOnce(svg: string): string {
  return svg
    .replace(SCRIPT_BLOCK, "")
    .replace(SCRIPT_SELF_CLOSING, "")
    .replace(EMBEDDING_ELEMENTS, "")
    .replace(EVENT_HANDLER, "")
    .replace(EXTERNAL_HREF, "");
}

/**
 * Makes an upstream SVG safe enough to copy into the lesson assets: no
 * scripts, event handlers, embedded HTML or external links. Local references
 * (`#arrow`) are kept so markers and `<use>` keep working. Passes repeat until
 * the output is stable so nested payloads cannot reassemble.
 *
 * This is a regex filter, not a parser; the site should still serve SVGs via
 * `<img src>` and a strict CSP rather than inlining them.
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
