"use client";

import { useRef, useState, type MouseEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/routing";
import { runBoardFlip } from "./flip-dom";

/**
 * The language switch of the board: three plates. Clicking one flips every
 * plate on the page (the signature interaction) and then navigates. Without
 * JavaScript or with reduced motion it is a plain link.
 */
export function LanguageFlag() {
  const t = useTranslations("landing");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState<Locale | null>(null);

  const onSelect = (locale: Locale) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (locale === current || busy.current) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // let the link navigate
    event.preventDefault();
    busy.current = true;
    setPending(locale);
    void runBoardFlip(document, locale).then(() => {
      router.replace(pathname, { locale });
    });
  };

  return (
    <nav aria-label={t("language")}>
      <ul className="flex items-center gap-1.5">
        {LOCALES.map((locale) => {
          const isCurrent = locale === current;
          const tone = isCurrent || pending === locale ? "amber" : "flap";
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                lang={locale}
                hrefLang={locale}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`${locale.toUpperCase()}: ${LOCALE_LABELS[locale]}`}
                onClick={onSelect(locale)}
                className="flap flap--link"
                data-tone={tone}
                data-flap-row={locale}
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
