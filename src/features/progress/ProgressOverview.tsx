"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LessonStatusBadge } from "./LessonStatusBadge";
import { nextLessonIndex, trackSummary } from "./selectors";
import { useProgress } from "./store";

export type OverviewLesson = { key: string; slug: string; title: string };

type Props = { lessons: readonly OverviewLesson[]; trackSlug: string };

/*
 * Native progress bar, the summary sentence and the lesson checklist. Links use
 * next/link with an explicit locale prefix so the island stays testable in jsdom.
 */
export function ProgressOverview({ lessons, trackSlug }: Props) {
  const t = useTranslations("progress");
  const locale = useLocale();
  const { state } = useProgress();
  const keys = lessons.map((lesson) => lesson.key);
  const summary = trackSummary(state, keys);
  const nextIndex = nextLessonIndex(state, keys);

  return (
    <section
      aria-labelledby="progress-summary"
      className="mt-10 max-w-[var(--measure)] rounded-flap border border-paper-line bg-paper-elev p-6"
    >
      <p
        id="progress-summary"
        className="font-board text-3xl font-bold tracking-wide uppercase"
      >
        {t("summary", summary)}
      </p>
      <progress
        value={summary.done}
        max={Math.max(1, summary.total)}
        aria-label={t("title")}
        className="mt-3 block h-3 w-full appearance-none overflow-hidden rounded-flap border border-paper-line bg-paper-line [&::-moz-progress-bar]:bg-ink [&::-webkit-progress-bar]:bg-paper-line [&::-webkit-progress-value]:bg-ink"
      >
        {summary.percent}%
      </progress>
      {summary.done === 0 && <p className="mt-4 text-ink-muted">{t("empty")}</p>}

      <h2 className="mt-8 font-board text-xl font-bold tracking-wide text-ink-muted uppercase">
        {t("lessons", { count: summary.total })}
      </h2>
      <ul className="mt-3 divide-y divide-paper-line border-y border-paper-line">
        {lessons.map((lesson, index) => (
          <li
            key={lesson.key}
            className="grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-3 py-2.5"
          >
            <span className="font-board text-xl font-bold text-ink-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <Link
              href={`/${locale}/tracks/${trackSlug}/${lesson.slug}`}
              className={index === nextIndex ? "font-semibold text-ink" : "text-ink"}
            >
              {lesson.title}
            </Link>
            <LessonStatusBadge lessonKey={lesson.key} />
          </li>
        ))}
      </ul>
    </section>
  );
}
