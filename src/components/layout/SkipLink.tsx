import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("nav");
  return (
    <a href="#content" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
