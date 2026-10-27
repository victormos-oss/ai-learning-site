import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MDXContent } from "@content-collections/mdx/react";
import { routing } from "@/i18n/routing";
import { getLesson, getLessonParams, getTrackBySlug } from "@/features/content/loader";
import { pickLocalized } from "@/features/content/resolve";
import { lessonMdxComponents } from "@/features/mdx/components";
import { Attribution } from "@/features/mdx/components/Attribution";
import { LessonHeader } from "@/features/lesson/LessonHeader";
import { LessonNav } from "@/features/lesson/LessonNav";
import { FallbackBanner } from "@/features/lesson/FallbackBanner";
import { MarkCompleteButton } from "@/features/progress";
import { LessonQuiz } from "@/features/quiz/LessonQuiz";

type Params = { locale: string; track: string; lesson: string };
type Props = { params: Promise<Params> };

export function generateStaticParams(): Params[] {
  return routing.locales.flatMap((locale) =>
    getLessonParams().map((p) => ({ locale, ...p })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, track, lesson } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const resolved = getLesson({ trackSlug: track, lessonSlug: lesson, locale });
  if (!resolved) return {};
  return {
    title: resolved.lesson.title,
    description: resolved.lesson.summary,
    robots: resolved.isFallback ? { index: false, follow: true } : undefined,
  };
}

export default async function LessonPage({ params }: Props) {
  const { locale, track, lesson } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const trackMeta = getTrackBySlug(track);
  const resolved = getLesson({ trackSlug: track, lessonSlug: lesson, locale });
  if (!trackMeta || !resolved) notFound();

  const t = await getTranslations("lesson");
  const { lesson: doc, isFallback, neighbours } = resolved;
  const assetBase = `/content/${doc.trackDir}/${doc.moduleDir}/${doc.lessonDir}/assets`;
  const sourceUrl = doc.attribution[0]?.url;
  const components = lessonMdxComponents({
    figure: { assetBase, assets: doc.assets, locale },
    code: { files: doc.codeFiles, sourceUrl },
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <LessonHeader
        trackSlug={track}
        trackTitle={pickLocalized(trackMeta.title, locale)}
        title={doc.title}
        summary={doc.summary}
        estimatedMinutes={doc.estimatedMinutes}
        headings={doc.headings}
        tocLabel={t("toc")}
        breadcrumbsLabel={t("breadcrumbs")}
        tracksLabel={t("tracks")}
      />
      {isFallback && <FallbackBanner />}
      <article
        lang={doc.locale}
        className="lesson-body mx-auto mt-8 max-w-[var(--measure)]"
      >
        <MDXContent code={doc.body} components={components} />
        <Attribution items={doc.attribution} />
      </article>
      {doc.quizData && (
        <div className="mx-auto mt-12 max-w-[var(--measure)]">
          <LessonQuiz quiz={doc.quizData} locale={locale} lessonKey={doc.key} />
        </div>
      )}
      <MarkCompleteButton lessonKey={doc.key} />
      <LessonNav trackSlug={track} prev={neighbours.prev} next={neighbours.next} />
    </div>
  );
}
