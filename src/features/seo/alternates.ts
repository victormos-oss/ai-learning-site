import { LOCALES, type Locale } from "@/i18n/routing";

/**
 * hreflang map for a path: every locale that has usable content, plus
 * x-default pointing at English. Paths are locale-less, e.g. "/tracks".
 */
export function languageAlternates(
  path: string,
  availableLocales: readonly Locale[] = LOCALES,
): Record<string, string> {
  const normalized = path === "/" ? "" : path;
  const entries = availableLocales.map((locale) => [locale, `/${locale}${normalized}`]);
  return Object.fromEntries([...entries, ["x-default", `/en${normalized}`]]);
}

export function canonicalFor(locale: Locale, path: string): string {
  const normalized = path === "/" ? "" : path;
  return `/${locale}${normalized}`;
}
