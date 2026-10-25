import { useTranslations } from "next-intl";
import type { Attribution as AttributionRecord } from "@/features/content/schema";

type Props = { items: readonly AttributionRecord[] };

/** Rendered by the lesson layout from frontmatter, never hand-placed in MDX. */
export function Attribution({ items }: Props) {
  const t = useTranslations("lesson.attribution");
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="attribution-heading"
      className="mt-12 border-t border-paper-line pt-6 text-[0.95rem] text-ink-muted"
    >
      <h2
        id="attribution-heading"
        className="text-sm font-semibold tracking-wide uppercase"
      >
        {t("heading")}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={`${item.source}:${item.path ?? ""}`}>
            <span>{t(item.relation)} </span>
            <a href={item.url} rel="noopener" className="text-ink">
              {item.source}
              {item.path ? ` / ${item.path}` : ""}
            </a>
            <span>
              {" "}
              ({item.authors}, {t("license")} {item.license}
              {item.commit ? `, ${item.commit.slice(0, 7)}` : ""})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
