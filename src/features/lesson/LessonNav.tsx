import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import type { LessonNeighbour } from "@/features/content/types";

type Props = { trackSlug: string; prev: LessonNeighbour; next: LessonNeighbour };

export function LessonNav({ trackSlug, prev, next }: Props) {
  const t = useTranslations("lesson.nav");
  return (
    <nav
      aria-label={t("label")}
      className="mx-auto mt-12 grid max-w-[var(--measure)] gap-4 border-t border-paper-line pt-6 sm:grid-cols-2"
    >
      <div>
        {prev && (
          <Link
            href={`/tracks/${trackSlug}/${prev.slug}`}
            rel="prev"
            className="group inline-flex flex-col gap-1 no-underline"
          >
            <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
              <ArrowLeft aria-hidden="true" size={16} weight="bold" />
              {t("prev")}
            </span>
            <span className="font-semibold group-hover:underline">{prev.title}</span>
          </Link>
        )}
      </div>
      <div className="sm:text-right">
        {next ? (
          <Link
            href={`/tracks/${trackSlug}/${next.slug}`}
            rel="next"
            className="group inline-flex flex-col gap-1 no-underline sm:items-end"
          >
            <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
              {t("next")}
              <ArrowRight aria-hidden="true" size={16} weight="bold" />
            </span>
            <span className="font-semibold group-hover:underline">{next.title}</span>
          </Link>
        ) : (
          <Link href={`/tracks/${trackSlug}`} className="font-semibold">
            {t("backToTrack")}
          </Link>
        )}
      </div>
    </nav>
  );
}
