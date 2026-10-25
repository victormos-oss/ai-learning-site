import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/features/i18n/LanguageSwitcher";
import { ThemeSwitcher } from "@/features/theme/ThemeSwitcher";

const NAV_ITEMS = [
  { href: "/tracks", key: "tracks" },
  { href: "/videos", key: "videos" },
  { href: "/progress", key: "progress" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const common = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 h-[var(--header-h)] border-b border-paper-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <Link
          href="/"
          className="font-board text-xl font-bold tracking-wide text-ink uppercase no-underline"
        >
          {common("siteName")}
        </Link>
        <nav aria-label={t("main")} className="hidden md:block">
          <ul className="flex items-center gap-6 text-[0.95rem] font-medium">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="text-ink-muted no-underline hover:text-ink hover:underline"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-4">
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
