import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { headingSlug } from "./heading-slug";

type Props = {
  trackSlug: string;
  trackTitle: string;
  title: string;
  summary: string;
  estimatedMinutes?: number;
  headings: readonly string[];
  tocLabel: string;
  breadcrumbsLabel: string;
  tracksLabel: string;
};

export function LessonHeader(props: Props) {
  const t = useTranslations("lesson");
  return (
    <header className="mx-auto max-w-[var(--measure)]">
      <nav aria-label={props.breadcrumbsLabel} className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/tracks">{props.tracksLabel}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/tracks/${props.trackSlug}`}>{props.trackTitle}</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {props.title}
          </li>
        </ol>
      </nav>
      <h1 className="mt-6 font-board text-5xl leading-[1.02] font-bold tracking-wide uppercase md:text-6xl">
        {props.title}
      </h1>
      <p className="mt-4 text-lg text-ink-muted">{props.summary}</p>
      {props.estimatedMinutes && (
        <p className="mt-2 text-sm text-ink-muted">
          {t("minutes", { count: props.estimatedMinutes })}
        </p>
      )}
      {props.headings.length > 1 && (
        <nav
          aria-label={props.tocLabel}
          className="mt-8 rounded-flap border border-paper-line bg-paper-elev px-5 py-4"
        >
          <p className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {props.tocLabel}
          </p>
          <ol className="mt-2 columns-1 gap-8 text-[0.95rem] md:columns-2">
            {props.headings.map((heading) => (
              <li key={heading} className="py-0.5">
                <a href={`#${headingSlug(heading)}`}>{heading}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}
