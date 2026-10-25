import { useTranslations } from "next-intl";
import type { ContentLocale } from "@/features/content/schema";

export type FigureContext = {
  /** Public URL prefix for this lesson's assets, e.g. /content/claude-code-zero/02-one-agent/01-agent-loop/assets */
  assetBase: string;
  /** File names available in the lesson's assets folder. */
  assets: readonly string[];
  locale: ContentLocale;
};

type Props = {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  context: FigureContext;
};

/** Picks `<src>.<locale>.svg`, then `<src>.en.svg`, then `<src>.svg`. */
export function pickFigureFile(
  src: string,
  locale: ContentLocale,
  assets: readonly string[],
): { file: string; isEnglishFallback: boolean } | null {
  const candidates = [
    { file: `${src}.${locale}.svg`, fallback: false },
    { file: `${src}.en.svg`, fallback: locale !== "en" },
    { file: `${src}.svg`, fallback: false },
    { file: src, fallback: false },
  ];
  const hit = candidates.find((c) => assets.includes(c.file));
  return hit ? { file: hit.file, isEnglishFallback: hit.fallback } : null;
}

export function Figure({ src, alt, caption, width, height, context }: Props) {
  const t = useTranslations("lesson.figure");
  const picked = pickFigureFile(src, context.locale, context.assets);
  if (!picked) return null;

  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${context.assetBase}/${picked.file}`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="mx-auto h-auto max-w-full rounded-flap bg-paper-elev"
      />
      {(caption || picked.isEnglishFallback) && (
        <figcaption className="mt-2 text-center text-sm text-ink-muted">
          {caption}
          {picked.isEnglishFallback && (
            <span lang={context.locale}> {t("englishOnly")}</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
