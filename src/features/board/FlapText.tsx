import type { ElementType } from "react";

export type FlapTone = "flap" | "amber" | "done";
export type FlapSize = "sm" | "md" | "lg" | "xl";

type Props = {
  text: string;
  locale?: string;
  tone?: FlapTone;
  size?: FlapSize;
  /** Element that carries the accessible text; defaults to span. */
  as?: ElementType;
  className?: string;
  id?: string;
};

/**
 * A word set as a row of split-flap plates. The plates are decorative
 * (aria-hidden); the real text sits next to them for assistive technology
 * and for search engines, so uppercase plates never change how it is read.
 */
export function FlapText({
  text,
  locale,
  tone = "flap",
  size = "md",
  as: Tag = "span",
  className,
  id,
}: Props) {
  const chars = [...text.toLocaleUpperCase(locale)];
  return (
    <Tag
      id={id}
      className={["flap-text", `flap-text--size-${size}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <span aria-hidden="true" className="contents" data-flap-row={text}>
        {chars.map((char, index) => (
          <span
            key={`${index}-${char}`}
            className="flap"
            data-tone={tone}
            data-space={char === " " ? "true" : undefined}
            data-char={char}
          >
            {char === " " ? "" : char}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </Tag>
  );
}
