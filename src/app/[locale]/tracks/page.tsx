import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getOrderedLessons, getTracks } from "@/features/content/loader";
import { pickLocalized } from "@/features/content/resolve";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("tracks") };
}

export default async function TracksPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <h1 className="font-board text-5xl font-bold tracking-wide uppercase md:text-6xl">
        {t("tracks")}
      </h1>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {getTracks().map((track) => (
          <li
            key={track.key}
            className="relative rounded-flap border border-paper-line bg-paper-elev p-6 hover:border-ink-muted"
          >
            <h2 className="font-board text-3xl font-bold tracking-wide uppercase">
              <Link
                href={`/tracks/${track.slug}`}
                className="no-underline after:absolute after:inset-0 after:content-['']"
              >
                {pickLocalized(track.title, locale)}
              </Link>
            </h2>
            <p className="mt-2 text-ink-muted">
              {pickLocalized(track.description, locale)}
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              {getOrderedLessons(track.trackDir).length} ·{" "}
              {pickLocalized(track.title, "en")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
