import { defineRouting } from "next-intl/routing";

export const LOCALES = ["en", "ru", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
  localeDetection: true,
});

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ru: "Русский",
  es: "Español",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
