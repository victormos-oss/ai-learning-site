"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_LABELS, LOCALES } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("nav");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")}>
      <ul className="flex items-center gap-1">
        {LOCALES.map((locale) => {
          const isCurrent = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={isCurrent ? "true" : undefined}
                // Visible text must be part of the accessible name (WCAG 2.5.3).
                aria-label={`${locale.toUpperCase()}: ${LOCALE_LABELS[locale]}`}
                className={
                  "inline-flex h-9 min-w-9 items-center justify-center rounded-flap px-2 font-board text-base font-bold uppercase no-underline " +
                  (isCurrent
                    ? "bg-amber text-amber-ink"
                    : "text-ink-muted hover:bg-paper-elev hover:text-ink")
                }
              >
                {locale}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
