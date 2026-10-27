import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import {
  groupSources,
  readLicenseText,
  readSources,
  type LicensedSource,
} from "@/features/licenses/sources";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "licenses" });
  return { title: t("title") };
}

function SourceItem({
  source,
  linkLabel,
}: {
  source: LicensedSource;
  linkLabel: string;
}) {
  return (
    <li className="py-4">
      <p className="font-semibold">{source.name}</p>
      <p className="mt-1 text-sm text-ink-muted">
        {source.authors} · {source.license}
        {source.copyright ? ` · ${source.copyright}` : ""}
      </p>
      <p className="mt-1 text-sm">
        <a href={source.url} rel="noopener">
          {linkLabel}: {source.name}
        </a>
      </p>
    </li>
  );
}

function SourceGroup({
  id,
  heading,
  note,
  sources,
  linkLabel,
}: {
  id: string;
  heading: string;
  note?: string;
  sources: LicensedSource[];
  linkLabel: string;
}) {
  return (
    <section aria-labelledby={id} className="mt-10 first:mt-0">
      <h2 id={id} className="font-board text-3xl font-bold tracking-wide uppercase">
        {heading}
      </h2>
      {note && <p className="mt-2 text-ink-muted">{note}</p>}
      <ul className="mt-2 divide-y divide-paper-line border-y border-paper-line">
        {sources.map((source) => (
          <SourceItem key={source.id} source={source} linkLabel={linkLabel} />
        ))}
      </ul>
    </section>
  );
}

export default async function LicensesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("licenses");
  const grouped = groupSources(readSources());
  const mit = readLicenseText("MIT");

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8">
      <header className="max-w-[var(--measure)]">
        <h1 className="font-board text-5xl font-bold tracking-wide uppercase md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-lg text-ink-muted">{t("intro")}</p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-2">
        <div className="max-w-[var(--measure)]">
          <SourceGroup
            id="adapted-heading"
            heading={t("adapted")}
            sources={grouped.adapted}
            linkLabel={t("viewOnGitHub")}
          />
          <SourceGroup
            id="quoted-heading"
            heading={t("quoted")}
            sources={grouped.quoted}
            linkLabel={t("viewOnGitHub")}
          />
          <SourceGroup
            id="linked-heading"
            heading={t("linked")}
            note={t("linkedNote")}
            sources={grouped.linked}
            linkLabel={t("viewOnGitHub")}
          />
          <section aria-labelledby="site-heading" className="mt-10">
            <h2
              id="site-heading"
              className="font-board text-3xl font-bold tracking-wide uppercase"
            >
              {t("siteCode")}
            </h2>
            <p className="mt-2 text-ink-muted">{t("siteCodeNote")}</p>
          </section>
        </div>

        {mit && (
          <section aria-labelledby="mit-heading">
            <h2
              id="mit-heading"
              className="font-board text-3xl font-bold tracking-wide uppercase"
            >
              {t("licenseText")}: MIT
            </h2>
            <pre
              lang="en"
              className="mt-2 overflow-x-auto rounded-flap border border-paper-line bg-paper-elev p-5 font-mono text-[0.85rem] leading-relaxed whitespace-pre-wrap"
            >
              {mit}
            </pre>
          </section>
        )}
      </div>
    </div>
  );
}
