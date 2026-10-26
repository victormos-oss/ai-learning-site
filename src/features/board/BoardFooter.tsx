import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/components/layout/SiteFooter";

/** Footer in the board's own material: cream text on anthracite, hairline above. */
export function BoardFooter() {
  const t = useTranslations("common");
  return (
    <footer className="board-footer">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-6 text-sm md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          <span className="font-board text-base font-bold tracking-wide uppercase">
            {t("author")}
          </span>
          <span className="text-board-muted">, {t("authorRole")}</span>
        </p>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <a href={`https://t.me/${CONTACT_TELEGRAM}`} rel="noopener">
            @{CONTACT_TELEGRAM}
          </a>
          <Link href="/licenses">{t("sources.licenses")}</Link>
        </p>
      </div>
    </footer>
  );
}
