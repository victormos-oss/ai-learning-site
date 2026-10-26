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
 * (aria-hidden) and draw their glyph from data-char through CSS, so the DOM
 * carries the text exactly once: in the visually hidden span that assistive
 * technology and search engines read. Letters of one word never wrap apart;
 * lines may break between words, where the plates container leaves a gap.
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
  const words = text
    .toLocaleUpperCase(locale)
    .split(" ")
    .filter((w) => w.length > 0);
  return (
    <Tag
      id={id}
      className={["flap-text", `flap-text--size-${size}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      <span aria-hidden="true" className="flap-text__plates" data-flap-row={text}>
        {words.map((word, wordIndex) => (
          <span key={`${wordIndex}-${word}`} className="flap-word">
            {[...word].map((char, index) => (
              <span
                key={`${index}-${char}`}
                className="flap"
                data-tone={tone}
                data-char={char}
              />
            ))}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </Tag>
  );
}
