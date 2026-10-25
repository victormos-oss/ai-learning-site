import { useTranslations } from "next-intl";
import { CodeBlock } from "./CodeBlock";

export type CodeFileContext = {
  files: Readonly<Record<string, { content: string; html: string }>>;
  /** GitHub tree URL of the lesson's source folder at the pinned commit. */
  sourceUrl?: string;
};

type Props = { src: string; context: CodeFileContext };

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  py: "python",
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  json: "json",
  sh: "bash",
  md: "markdown",
};

export function CodeFile({ src, context }: Props) {
  const t = useTranslations("lesson.code");
  const file = context.files[src];
  if (!file) return null;
  const extension = src.split(".").pop() ?? "";
  const language = LANGUAGE_BY_EXTENSION[extension] ?? extension;

  return (
    <CodeBlock
      html={file.html}
      raw={file.content}
      language={language}
      title={`${t("file")}: ${src}`}
      footer={
        context.sourceUrl ? (
          <a href={`${context.sourceUrl}/${src}`} rel="noopener">
            {t("openSource")}
          </a>
        ) : undefined
      }
    />
  );
}
