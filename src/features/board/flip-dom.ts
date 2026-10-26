import { FLAP_ALPHABET, MAX_TOTAL_MS, STAGGER_MS, STEP_MS } from "./flip";

const HALF_FLIP_MS = STEP_MS * 2;

function randomGlyph(): string {
  const index = Math.floor(Math.random() * FLAP_ALPHABET.length);
  return FLAP_ALPHABET[index] ?? " ";
}

/** Plates render their glyph from data-char (CSS content); link plates carry real text. */
function readGlyph(plate: HTMLElement): string {
  return plate.dataset.char ?? plate.textContent ?? "";
}

function writeGlyph(plate: HTMLElement, glyph: string): void {
  if (plate.dataset.char !== undefined) plate.dataset.char = glyph;
  else plate.textContent = glyph;
}

function flipOne(plate: HTMLElement, delayMs: number, finalText: string): Promise<void> {
  const steps = 2 + Math.floor(Math.random() * 3);
  return new Promise((resolve) => {
    let step = 0;
    const tick = () => {
      writeGlyph(plate, step < steps ? randomGlyph() : finalText);
      const animation = plate.animate(
        [
          { transform: "rotateX(0deg)" },
          { transform: "rotateX(-88deg)" },
          { transform: "rotateX(0deg)" },
        ],
        { duration: HALF_FLIP_MS, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
      );
      animation.onfinish = () => {
        step += 1;
        if (step <= steps) tick();
        else resolve();
      };
    };
    window.setTimeout(tick, delayMs);
  });
}

/**
 * Flips every plate on the page left to right with a mechanical stagger. The
 * plates settle on their current text (the new page will carry the new words)
 * except the language flag, which settles on the target locale. Bounded by
 * MAX_TOTAL_MS so it never needs a pause control.
 */
export async function runBoardFlip(root: Document, targetLocale: string): Promise<void> {
  const plates = [
    ...root.querySelectorAll<HTMLElement>(".flap:not([data-space='true'])"),
  ];
  if (plates.length === 0) return;
  const stagger = Math.min(STAGGER_MS, (MAX_TOTAL_MS - HALF_FLIP_MS * 5) / plates.length);
  await Promise.all(
    plates.map((plate, index) => {
      const row = plate.getAttribute("data-flap-row");
      const isFlag = plate.classList.contains("flap--link");
      const finalText = isFlag && row === targetLocale ? targetLocale : readGlyph(plate);
      return flipOne(plate, Math.round(index * stagger), finalText);
    }),
  );
}
