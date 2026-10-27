"use client";

import { useTranslations } from "next-intl";
import { lessonStatus, type LessonStatus } from "./selectors";
import { useProgress } from "./store";

type Props = { lessonKey: string; className?: string };

const TONE: Record<LessonStatus, string> = {
  completed: "border-amber bg-amber text-amber-ink",
  started: "border-ink text-ink",
  new: "border-paper-line text-ink-muted",
};

/**
 * Small split-flap style plate with the lesson status as text. On the server
 * and before hydration it shows "not started", then updates without moving
 * the layout.
 */
export function LessonStatusBadge({ lessonKey, className = "" }: Props) {
  const t = useTranslations("progress");
  const { state } = useProgress();
  const status = lessonStatus(state, lessonKey);

  return (
    <span
      data-status={status}
      className={`inline-block rounded-flap border px-1.5 py-px align-middle font-board text-xs font-bold tracking-wider uppercase ${TONE[status]} ${className}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
