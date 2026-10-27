"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useAnnounce } from "@/features/a11y/Announcer";
import { downloadProgress } from "./export";
import { readProgressFile, type ImportFailure } from "./import";
import { useProgress } from "./store";

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center rounded-flap border-2 border-ink bg-paper-elev px-4 py-2 font-semibold text-ink hover:bg-ink hover:text-paper active:translate-y-px";
const QUIET_CLASS =
  "inline-flex min-h-11 items-center rounded-flap border-2 border-paper-line px-4 py-2 font-semibold text-ink-muted hover:border-ink hover:text-ink active:translate-y-px";

function failureKey(reason: ImportFailure): "importTooLarge" | "importError" {
  return reason === "too-large" ? "importTooLarge" : "importError";
}

type ImportFieldProps = { onFile: (file: File) => Promise<void> };

/** File picker with a visible label; the input is cleared after each pick. */
function ImportField({ onFile }: ImportFieldProps) {
  const t = useTranslations("progress");
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    await onFile(file);
    input.value = "";
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="font-semibold">
        {t("import")}
      </label>
      <input
        id={inputId}
        type="file"
        accept="application/json,.json"
        aria-describedby={hintId}
        onChange={onChange}
        className="max-w-xs text-sm file:mr-3 file:rounded-flap file:border-0 file:bg-ink file:px-3 file:py-2 file:font-semibold file:text-paper"
      />
      <span id={hintId} className="text-sm text-ink-muted">
        {t("importHint")}
      </span>
    </div>
  );
}

type ResetControlsProps = { onConfirm: () => void };

/**
 * Two-step reset: the question and both answers are plain buttons, no dialog.
 * Opening moves focus to the safe answer; closing returns it to the reset
 * button, so keyboard users never land on the document body.
 */
function ResetControls({ onConfirm }: ResetControlsProps) {
  const t = useTranslations("progress");
  const [isConfirming, setIsConfirming] = useState(false);
  const resetRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocus = useRef(false);

  useEffect(() => {
    if (isConfirming) {
      cancelRef.current?.focus();
      return;
    }
    if (shouldRestoreFocus.current) {
      shouldRestoreFocus.current = false;
      resetRef.current?.focus();
    }
  }, [isConfirming]);

  const close = () => {
    shouldRestoreFocus.current = true;
    setIsConfirming(false);
  };

  if (!isConfirming) {
    return (
      <button
        ref={resetRef}
        type="button"
        onClick={() => setIsConfirming(true)}
        className={QUIET_CLASS}
      >
        {t("reset")}
      </button>
    );
  }

  const confirm = () => {
    close();
    onConfirm();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="font-semibold">{t("resetConfirm")}</p>
      <button type="button" onClick={confirm} className={BUTTON_CLASS}>
        {t("resetYes")}
      </button>
      <button ref={cancelRef} type="button" onClick={close} className={QUIET_CLASS}>
        {t("resetNo")}
      </button>
    </div>
  );
}

/** Export, import and reset. Every outcome is shown as text and announced once. */
export function ImportExport() {
  const t = useTranslations("progress");
  const announce = useAnnounce();
  const { state, isPersistent, importProgress, resetProgress, lastWriteResult } =
    useProgress();
  const [message, setMessage] = useState<string | null>(null);

  const report = (text: string) => {
    setMessage(text);
    announce(text);
  };

  const onExport = () => {
    const result = downloadProgress(state);
    if (!result.ok) report(t("exportError"));
  };

  const onFile = async (file: File) => {
    const result = await readProgressFile(file);
    if (!result.ok) {
      report(t(failureKey(result.reason)));
      return;
    }
    const count = importProgress(result.state);
    // The merge is in memory either way; say so when the browser refused to keep it.
    report(lastWriteResult().ok ? t("imported", { count }) : t("saveFailed"));
  };

  const onReset = () => {
    resetProgress();
    report(t("resetDone"));
  };

  return (
    <section className="mt-8 max-w-[var(--measure)]">
      {!isPersistent && (
        <p role="note" className="mb-4 rounded-flap bg-amber px-4 py-3 text-amber-ink">
          {t("storageWarning")}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-6">
        <button type="button" onClick={onExport} className={BUTTON_CLASS}>
          {t("export")}
        </button>
        <ImportField onFile={onFile} />
      </div>
      {message && <p className="mt-4 font-medium">{message}</p>}
      <div className="mt-8 border-t border-paper-line pt-6">
        <ResetControls onConfirm={onReset} />
      </div>
    </section>
  );
}
