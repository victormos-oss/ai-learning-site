import type { ReactNode } from "react";
import { Info, Lightbulb, Warning } from "@phosphor-icons/react/dist/ssr";

type Kind = "note" | "tip" | "warning";

const ICONS = { note: Info, tip: Lightbulb, warning: Warning } as const;

type Props = { kind?: Kind; title: string; children: ReactNode };

/** aside with role=note; the title is the visible text prefix, colour is secondary. */
export function Callout({ kind = "note", title, children }: Props) {
  const Icon = ICONS[kind];
  return (
    <aside
      role="note"
      className="callout my-6 rounded-flap border border-paper-line bg-paper-elev px-5 py-4"
      data-kind={kind}
    >
      <p className="flex items-center gap-2 font-semibold">
        <Icon aria-hidden="true" size={20} weight="bold" />
        <span>{title}</span>
      </p>
      <div className="mt-2 text-[0.98rem] [&>p]:mt-2 [&>p:first-child]:mt-0">
        {children}
      </div>
    </aside>
  );
}
