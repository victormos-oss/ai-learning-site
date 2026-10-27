import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import ru from "../../../messages/ru/progress.json";
import { AnnouncerProvider } from "@/features/a11y/Announcer";
import { STORAGE_KEY } from "@/features/progress/storage";

/** Renders with Russian progress messages and the live region used for announcements. */
export function renderWithProgressIntl(ui: ReactElement): RenderResult {
  return render(
    <NextIntlClientProvider locale="ru" messages={{ progress: ru }} timeZone="UTC">
      <AnnouncerProvider>{ui}</AnnouncerProvider>
    </NextIntlClientProvider>,
  );
}

/** Wipes stored progress and tells the store to re-read, as another tab would. */
export function resetStoredProgress(raw?: string): void {
  window.localStorage.clear();
  if (raw !== undefined) window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
}

export function readStoredProgress(): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as unknown);
}
