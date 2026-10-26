import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("common");
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-24 md:px-8">
      <h1 className="font-board text-5xl font-bold tracking-wide uppercase">
        {t("notFound.title")}
      </h1>
      <p className="mt-4 max-w-[48ch] text-lg text-ink-muted">{t("notFound.body")}</p>
      <p className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center rounded-flap bg-amber px-5 py-3 font-semibold text-amber-ink no-underline"
        >
          {t("notFound.home")}
        </Link>
      </p>
    </section>
  );
}
