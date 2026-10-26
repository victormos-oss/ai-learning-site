import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { readWebinars } from "@/features/media/loader";
import { WebinarList } from "@/features/media/WebinarList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "media" });
  return { title: t("webinars.title"), description: t("webinars.intro") };
}

export default async function WebinarsPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("media");
  const webinars = readWebinars().map((w) => ({
    slug: w.slug,
    title: w.title,
    description: w.description,
    startsAt: w.startsAt,
    durationMinutes: w.durationMinutes,
    registrationUrl: w.registrationUrl,
    recordingUrl: w.recording,
  }));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <header className="max-w-[var(--measure)]">
        <h1 className="font-board text-5xl font-bold tracking-wide uppercase md:text-6xl">
          {t("webinars.title")}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">{t("webinars.intro")}</p>
      </header>
      <WebinarList
        webinars={webinars}
        locale={locale}
        labels={{
          upcoming: t("webinars.upcoming"),
          past: t("webinars.past"),
          emptyUpcoming: t("webinars.emptyUpcoming"),
          emptyPast: t("webinars.emptyPast"),
          register: t("webinars.register"),
          recording: t("webinars.recording"),
        }}
      />
    </div>
  );
}
