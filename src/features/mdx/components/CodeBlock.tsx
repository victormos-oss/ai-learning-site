import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { CopyButton } from "./CopyButton";

type Props = {
  /** Pre-highlighted HTML produced by Shiki at build time. */
  html: string;
  raw: string;
  language: string;
  title?: string;
  footer?: ReactNode;
};

/**
 * Figure around a highlighted block: a focusable, labelled scroll region
 * (axe: scrollable-region-focusable), a caption and a copy button.
 */
export function CodeBlock({ html, raw, language, title, footer }: Props) {
  const t = useTranslations("lesson.code");
  return (
    <figure className="code-block my-6 overflow-hidden rounded-flap border border-paper-line bg-[var(--code-bg)] text-[var(--code-ink)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-sm">
        <figcaption className="truncate font-mono text-xs tracking-wide uppercase opacity-80">
          {title ?? language}
        </figcaption>
        <CopyButton text={raw} label={t("copy")} doneLabel={t("copied")} />
      </div>
      {/* A horizontally scrollable region must be keyboard reachable (axe: scrollable-region-focusable). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div
        tabIndex={0}
        role="region"
        aria-label={t("regionLabel", { language })}
        className="overflow-x-auto px-4 py-4 text-[0.92rem] leading-relaxed [&_code]:font-mono [&_pre]:m-0 [&_pre]:bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {footer && (
        <div className="border-t border-white/10 px-4 py-2 text-sm">{footer}</div>
      )}
    </figure>
  );
}
