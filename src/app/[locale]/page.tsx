import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
      <h1 className="font-board text-5xl font-bold tracking-wide uppercase">
        {t("siteName")}
      </h1>
      <p className="mt-4 max-w-[48ch] text-lg text-ink-muted">{t("tagline")}</p>
    </section>
  );
}
