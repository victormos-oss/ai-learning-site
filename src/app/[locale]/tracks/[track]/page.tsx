import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getModulesForTrack,
  getOrderedLessons,
  getTrackBySlug,
  getTracks,
} from "@/features/content/loader";
import { pickLocalized } from "@/features/content/resolve";

type Params = { locale: string; track: string };
type Props = { params: Promise<Params> };

export function generateStaticParams(): Params[] {
  return routing.locales.flatMap((locale) =>
    getTracks().map((t) => ({ locale, track: t.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, track } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const meta = getTrackBySlug(track);
  if (!meta) return {};
  return {
    title: pickLocalized(meta.title, locale),
    description: pickLocalized(meta.description, locale),
  };
}

export default async function TrackPage({ params }: Props) {
  const { locale, track } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const meta = getTrackBySlug(track);
  if (!meta) notFound();

  const t = await getTranslations("lesson");
  const modules = getModulesForTrack(meta.trackDir);
  const lessons = getOrderedLessons(meta.trackDir);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <header className="max-w-[var(--measure)]">
        <h1 className="font-board text-5xl leading-[1.02] font-bold tracking-wide uppercase md:text-6xl">
          {pickLocalized(meta.title, locale)}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">
          {pickLocalized(meta.description, locale)}
        </p>
      </header>

      <div className="mt-10 space-y-10">
        {modules.map((module) => {
          const moduleLessons = lessons.filter((l) => l.moduleKey === module.key);
          return (
            <section key={module.key} aria-labelledby={`module-${module.slug}`}>
              <h2
                id={`module-${module.slug}`}
                className="font-board text-3xl font-bold tracking-wide uppercase"
              >
                <span className="text-ink-muted">
                  {t("module", { order: module.order })}.
                </span>{" "}
                {pickLocalized(module.title, locale)}
              </h2>
              {module.summary && (
                <p className="mt-1 max-w-[60ch] text-ink-muted">
                  {pickLocalized(module.summary, locale)}
                </p>
              )}
              {moduleLessons.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">{t("comingSoon")}</p>
              ) : (
                <ol className="mt-4 divide-y divide-paper-line border-y border-paper-line">
                  {moduleLessons.map((lesson, index) => (
                    <li key={lesson.key}>
                      <Link
                        href={`/tracks/${track}/${lesson.slug}`}
                        className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 py-3 no-underline hover:bg-paper-elev"
                      >
                        <span className="font-board text-2xl font-bold text-ink-muted">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span>
                          <span className="font-semibold">{lesson.title}</span>
                          <span className="block text-sm text-ink-muted">
                            {lesson.summary}
                          </span>
                        </span>
                        {lesson.estimatedMinutes && (
                          <span className="text-sm text-ink-muted">
                            {t("minutes", { count: lesson.estimatedMinutes })}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
