import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getModulesForTrack,
  getOrderedLessons,
  getTracks,
} from "@/features/content/loader";
import { pickLocalized } from "@/features/content/resolve";
import { DeparturesBoard } from "@/features/board/DeparturesBoard";
import { FlapText } from "@/features/board/FlapText";
import { CONTACT_EMAIL, CONTACT_TELEGRAM } from "@/components/layout/SiteFooter";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const track = getTracks()[0];
  if (!track) notFound();
  const lessons = getOrderedLessons(track.trackDir);
  const modules = getModulesForTrack(track.trackDir);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-16 md:px-8">
      <section aria-labelledby="track-title" className="board-hero">
        <FlapText
          as="h1"
          id="track-title"
          text={pickLocalized(track.title, locale)}
          locale={locale}
          size="xl"
          className="board-hero__title"
        />
        <p className="board-hero__sub">
          {t("subtitle", { modules: modules.length, lessons: lessons.length })}
        </p>
      </section>

      <DeparturesBoard trackSlug={track.slug} lessons={lessons} locale={locale} />

      <div className="board-sections">
        <section aria-labelledby="practice-heading" className="board-section">
          <h2 id="practice-heading">{t("practice.heading")}</h2>
          <p>{t("practice.body")}</p>
        </section>
        <section aria-labelledby="projects-heading" className="board-section">
          <h2 id="projects-heading">{t("projects.heading")}</h2>
          <p>{t("projects.body")}</p>
        </section>
        <section aria-labelledby="sources-heading" className="board-section">
          <h2 id="sources-heading">{t("sources.heading")}</h2>
          <p>{t("sources.body")}</p>
          <p>
            <Link href="/licenses" className="board-section__link">
              {t("sources.cta")}
            </Link>
          </p>
        </section>
        <section aria-labelledby="contact-heading" className="board-section">
          <h2 id="contact-heading">{t("contact.heading")}</h2>
          <p>{t("contact.body")}</p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <a href={`mailto:${CONTACT_EMAIL}`} className="board-section__link">
              {CONTACT_EMAIL}
            </a>
            <a
              href={`https://t.me/${CONTACT_TELEGRAM}`}
              rel="noopener"
              className="board-section__link"
            >
              @{CONTACT_TELEGRAM}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
