import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { pickLocalized } from "@/features/content/resolve";
import { readVideos } from "@/features/media/loader";
import { VideoFacade } from "@/features/media/VideoFacade";
import type { VideoProvider } from "@/features/media/providers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "media" });
  return { title: t("videos.title"), description: t("videos.intro") };
}

export default async function VideosPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("media");
  const videos = readVideos();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <header className="max-w-[var(--measure)]">
        <h1 className="font-board text-5xl font-bold tracking-wide uppercase md:text-6xl">
          {t("videos.title")}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">{t("videos.intro")}</p>
        <p className="mt-2">
          <Link href="/webinars">{t("webinars.title")}</Link>
        </p>
      </header>

      {videos.length === 0 ? (
        <p className="mt-10 max-w-[48ch] rounded-flap border border-paper-line bg-paper-elev px-5 py-4 text-ink-muted">
          {t("videos.empty")}
        </p>
      ) : (
        <ul className="mt-10 grid gap-10 md:grid-cols-2">
          {videos.map((video) => {
            const title = pickLocalized(video.title, locale);
            return (
              <li key={video.slug}>
                <VideoFacade
                  provider={video.video.provider as VideoProvider}
                  id={video.video.id}
                  title={title}
                  playLabel={t("videos.play", { title })}
                  poster={video.poster}
                />
                <h2 className="mt-3 text-xl font-semibold">{title}</h2>
                {video.description && (
                  <p className="mt-1 text-ink-muted">
                    {pickLocalized(video.description, locale)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
