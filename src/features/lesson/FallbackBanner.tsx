import { useTranslations } from "next-intl";
import { Translate } from "@phosphor-icons/react/dist/ssr";

/** Shown when a lesson has no usable translation and English is rendered instead. */
export function FallbackBanner() {
  const t = useTranslations("lesson.fallback");
  return (
    <aside
      role="note"
      className="mx-auto mt-8 flex max-w-[var(--measure)] gap-3 rounded-flap border border-amber/60 bg-paper-elev px-5 py-4"
    >
      <Translate aria-hidden="true" size={22} weight="bold" className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-[0.95rem] text-ink-muted">{t("body")}</p>
      </div>
    </aside>
  );
}
