import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageFlag } from "./LanguageFlag";

const NAV_ITEMS = [
  { href: "/tracks", key: "tracks" },
  { href: "/videos", key: "videos" },
  { href: "/progress", key: "progress" },
] as const;

/** The aluminium rail across the top of the board: brand, sections, language flag. */
export function Rail() {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  return (
    <header className="rail sticky top-0 z-40 h-[var(--header-h)]">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <Link
          href="/"
          className="font-board text-xl font-bold tracking-wide text-rail-ink uppercase no-underline"
        >
          {common("siteName")}
        </Link>
        <nav aria-label={t("main")} className="hidden md:block">
          <ul className="flex items-center gap-7 font-board text-base font-bold tracking-[0.08em] uppercase">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-rail-ink/80 no-underline hover:text-rail-ink hover:underline"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <LanguageFlag />
      </div>
    </header>
  );
}
