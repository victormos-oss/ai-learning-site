import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export const CONTACT_EMAIL = "victor@vdmitriev.com";
export const CONTACT_TELEGRAM = "prodmastermos";

export function SiteFooter() {
  const t = useTranslations("common");

  return (
    <footer className="mt-16 border-t border-paper-line">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-board text-2xl font-bold tracking-wide uppercase">
            {t("author")}
          </p>
          <p className="mt-1 max-w-[40ch] text-ink-muted">{t("authorRole")}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("contact.heading")}
          </h2>
          <p className="mt-2 max-w-[36ch]">{t("contact.consulting")}</p>
          <ul className="mt-3 space-y-1">
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>
                {t("contact.email")}: {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a href={`https://t.me/${CONTACT_TELEGRAM}`} rel="noopener">
                {t("contact.telegram")}: @{CONTACT_TELEGRAM}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {t("sources.heading")}
          </h2>
          <p className="mt-2 max-w-[40ch] text-ink-muted">{t("sources.note")}</p>
          <p className="mt-3">
            <Link href="/licenses">{t("sources.licenses")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
