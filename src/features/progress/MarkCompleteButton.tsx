"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check } from "@phosphor-icons/react";
import { useAnnounce } from "@/features/a11y/Announcer";
import { lessonStatus } from "./selectors";
import { progressActions, useProgress } from "./store";

type Props = { lessonKey: string };

const BASE_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-flap border-2 px-5 py-2 font-board text-lg font-bold tracking-wide uppercase transition-colors duration-[var(--dur-fast)] active:translate-y-px";
const IDLE_CLASS = "border-ink bg-paper-elev text-ink hover:bg-ink hover:text-paper";
const DONE_CLASS = "border-amber bg-amber text-amber-ink hover:border-ink";

/**
 * Toggle at the end of a lesson. Opening the lesson records `startedAt` once;
 * pressing the button toggles `completedAt` and announces the outcome.
 */
export function MarkCompleteButton({ lessonKey }: Props) {
  const t = useTranslations("progress");
  const announce = useAnnounce();
  const { state } = useProgress();
  const completed = lessonStatus(state, lessonKey) === "completed";

  useEffect(() => {
    progressActions.markStarted(lessonKey);
  }, [lessonKey]);

  const onToggle = () => {
    if (completed) {
      progressActions.unmarkCompleted(lessonKey);
      announce(t("announceUndone"));
      return;
    }
    progressActions.markCompleted(lessonKey);
    announce(t("announceDone"));
  };

  return (
    <div className="mx-auto mt-10 flex max-w-[var(--measure)] justify-end">
      <button
        type="button"
        aria-pressed={completed}
        onClick={onToggle}
        className={`${BASE_CLASS} ${completed ? DONE_CLASS : IDLE_CLASS}`}
      >
        {completed && <Check aria-hidden="true" size={20} weight="bold" />}
        <span>{completed ? t("markedDone") : t("markDone")}</span>
      </button>
    </div>
  );
}
