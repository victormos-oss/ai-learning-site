import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/content/resolve";
import type { ContentLocale } from "@/features/content/schema";
import type { LessonRecord } from "@/features/content/types";
import { FlightRow, type FlightStatus } from "./FlightRow";

type Props = {
  trackSlug: string;
  lessons: readonly LessonRecord[];
  locale: ContentLocale;
  /** Index of the lesson that is "departing" (the next one to take). */
  nextIndex?: number;
};

const ROWS_ON_BOARD = 6;

function statusFor(index: number, nextIndex: number): FlightStatus {
  if (index === nextIndex) return "departing";
  return index < nextIndex ? "arrived" : "scheduled";
}

/** The timetable: six rows, the next lesson in amber, the whole row a link. */
export function DeparturesBoard({ trackSlug, lessons, locale, nextIndex = 0 }: Props) {
  const t = useTranslations("landing");
  const rows = lessons.slice(0, ROWS_ON_BOARD);

  return (
    <section aria-labelledby="board-heading" className="departures">
      <h2 id="board-heading" className="sr-only">
        {t("board")}
      </h2>
      <div className="departures__head" aria-hidden="true">
        <span>{t("columns.lesson")}</span>
        <span>{t("columns.name")}</span>
        <span>{t("columns.time")}</span>
        <span>{t("columns.status")}</span>
      </div>
      <ol className="departures__rows">
        {rows.map((lesson, index) => {
          const status = statusFor(index, nextIndex);
          return (
            <FlightRow
              key={lesson.key}
              href={`/tracks/${trackSlug}/${lesson.slug}`}
              number={String(index + 1).padStart(2, "0")}
              name={
                lesson.boardTitle
                  ? pickLocalized(lesson.boardTitle, locale)
                  : lesson.title
              }
              duration={
                lesson.estimatedMinutes
                  ? t("minutes", { count: lesson.estimatedMinutes })
                  : undefined
              }
              status={status}
              statusLabel={t(`status.${status}`)}
              locale={locale}
            />
          );
        })}
      </ol>
      <p className="departures__all">
        <Link href={`/tracks/${trackSlug}`} className="departures__all-link">
          {t("allLessons")}
        </Link>
      </p>
    </section>
  );
}
