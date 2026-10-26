"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { useAnnounce } from "@/features/a11y/Announcer";

const RESET_DELAY_MS = 1800;

type Props = { text: string; label: string; doneLabel: string };

export function CopyButton({ text, label, doneLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const announce = useAnnounce();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), RESET_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      announce(doneLabel);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex h-8 items-center gap-1.5 rounded-flap px-2 text-xs font-medium opacity-90 hover:bg-white/10 hover:opacity-100 active:translate-y-px"
    >
      {copied ? (
        <Check aria-hidden="true" size={16} weight="bold" />
      ) : (
        <Copy aria-hidden="true" size={16} weight="bold" />
      )}
      <span>{copied ? doneLabel : label}</span>
    </button>
  );
}
