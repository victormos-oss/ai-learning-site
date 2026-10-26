import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Rail } from "@/features/board/Rail";
import { BoardFooter } from "@/features/board/BoardFooter";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

/** The landing is the departures board itself: anthracite ground, rail on top. */
export default async function BoardLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <div className="board flex min-h-dvh flex-col" data-surface="board">
      <Rail />
      <main id="content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <BoardFooter />
    </div>
  );
}
