import type { ReactNode } from "react";

const ALLOWED_HOSTS = ["code.claude.com", "docs.anthropic.com", "www.anthropic.com"];

type Props = { href: string; children: ReactNode; title?: string };

export function isAllowedDocHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && ALLOWED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

/** A short quote from official documentation. The source link is mandatory. */
export function DocQuote({ href, children, title }: Props) {
  if (!isAllowedDocHref(href)) {
    throw new Error(`DocQuote requires an https link to official docs, got: ${href}`);
  }
  return (
    <figure className="my-6 border-l border-paper-line pl-5">
      <blockquote lang="en" cite={href} className="text-[0.98rem] text-ink-muted italic">
        {children}
      </blockquote>
      <figcaption className="mt-2 text-sm">
        <a href={href} rel="noopener">
          {title ?? "Claude Code documentation"}
        </a>
      </figcaption>
    </figure>
  );
}
