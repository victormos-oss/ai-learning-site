import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getOrderedLessons, getTracks } from "@/features/content/loader";
import { ImportExport, ProgressOverview, type OverviewLesson } from "@/features/progress";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "progress" });
  return { title: t("title") };
}

/** Lessons of the first published track, in reading order. */
function firstTrackLessons(): { trackSlug: string; lessons: OverviewLesson[] } {
  const track = getTracks()[0];
  if (!track) return { trackSlug: "", lessons: [] };
  const lessons = getOrderedLessons(track.trackDir).map((lesson) => ({
    key: lesson.key,
    slug: lesson.slug,
    title: lesson.title,
  }));
  return { trackSlug: track.slug, lessons };
}

export default async function ProgressPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("progress");
  const { trackSlug, lessons } = firstTrackLessons();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <header className="max-w-[var(--measure)]">
        <h1 className="font-board text-5xl leading-[1.02] font-bold tracking-wide uppercase md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">{t("intro")}</p>
      </header>
      <ProgressOverview lessons={lessons} trackSlug={trackSlug} />
      <ImportExport />
    </div>
  );
}
