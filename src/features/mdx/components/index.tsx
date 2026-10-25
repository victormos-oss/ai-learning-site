import type { ComponentProps } from "react";
import { Callout } from "./Callout";
import { CodeFile, type CodeFileContext } from "./CodeFile";
import { DocQuote } from "./DocQuote";
import { Figure, type FigureContext } from "./Figure";

export type LessonMdxContext = {
  figure: FigureContext;
  code: CodeFileContext;
};

/**
 * The allow-list of components an MDX lesson may use. Anything else fails at
 * build time in the MDX guard plugin, so content cannot smuggle arbitrary JSX.
 */
export function lessonMdxComponents(context: LessonMdxContext) {
  return {
    Callout,
    DocQuote,
    Figure: (props: Omit<ComponentProps<typeof Figure>, "context">) => (
      <Figure {...props} context={context.figure} />
    ),
    CodeFile: (props: Omit<ComponentProps<typeof CodeFile>, "context">) => (
      <CodeFile {...props} context={context.code} />
    ),
  };
}

export const LESSON_COMPONENT_NAMES = [
  "Callout",
  "DocQuote",
  "Figure",
  "CodeFile",
] as const;
