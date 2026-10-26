import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "@fontsource-variable/sofia-sans-extra-condensed";
import "@fontsource-variable/golos-text";
import "@/styles/global.css";
import { routing } from "@/i18n/routing";
import { SkipLink } from "@/components/layout/SkipLink";
import { THEME_BOOT_SCRIPT } from "@/features/theme/theme-script";
import { AnnouncerProvider } from "@/features/a11y/Announcer";
import { RouteFocus } from "@/features/a11y/RouteFocus";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: {
      default: t("siteName"),
      template: `%s · ${t("siteName")}`,
    },
    description: t("tagline"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col bg-paper font-text text-ink antialiased">
        <NextIntlClientProvider>
          <AnnouncerProvider>
            <SkipLink />
            {children}
            <RouteFocus />
          </AnnouncerProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
