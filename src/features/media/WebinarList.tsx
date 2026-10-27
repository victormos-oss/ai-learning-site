"use client";

import { useSyncExternalStore } from "react";
import { pickLocalized } from "@/features/content/resolve";
import type { ContentLocale } from "@/features/content/schema";
import { watchUrlFor, type VideoProvider } from "./providers";

export type WebinarItem = {
  slug: string;
  title: { en: string; ru?: string; es?: string };
  description?: { en: string; ru?: string; es?: string };
  startsAt: string;
  durationMinutes: number;
  registrationUrl?: string;
  recordingUrl?: { provider: string; id: string };
};

type Labels = {
  upcoming: string;
  past: string;
  emptyUpcoming: string;
  emptyPast: string;
  register: string;
  recording: string;
};

type Props = { webinars: WebinarItem[]; locale: string; labels: Labels };

const noop = () => () => {};

/* Read once per page load: React requires the snapshot to be stable between calls. */
let clientNow = 0;
function getClientNow(): number {
  if (clientNow === 0) clientNow = Date.now();
  return clientNow;
}
const getServerNow = () => 0;

/**
 * Past and upcoming are decided on the client, so a static page never goes
 * stale between builds. Times render in the viewer's zone via Intl.
 */
export function WebinarList({ webinars, locale, labels }: Props) {
  const now = useSyncExternalStore(noop, getClientNow, getServerNow);
  const isServer = now === 0;
  const upcoming = webinars.filter((w) => isServer || Date.parse(w.startsAt) >= now);
  const past = webinars.filter((w) => !isServer && Date.parse(w.startsAt) < now);
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  });

  const renderItem = (w: WebinarItem, isPast: boolean) => {
    const title = pickLocalized(w.title, locale as ContentLocale);
    const recording = w.recordingUrl
      ? watchUrlFor(w.recordingUrl.provider as VideoProvider, w.recordingUrl.id)
      : undefined;
    return (
      <li key={w.slug} className="py-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-ink-muted">
          <time dateTime={w.startsAt}>{formatter.format(new Date(w.startsAt))}</time>
          {` · ${w.durationMinutes} min`}
        </p>
        {w.description && (
          <p className="mt-1">{pickLocalized(w.description, locale as ContentLocale)}</p>
        )}
        <p className="mt-2">
          {!isPast && w.registrationUrl && (
            <a href={w.registrationUrl} rel="noopener">
              {labels.register}: {title}
            </a>
          )}
          {isPast && recording && (
            <a href={recording} rel="noopener">
              {labels.recording}: {title}
            </a>
          )}
        </p>
      </li>
    );
  };

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-2">
      <section aria-labelledby="upcoming-heading">
        <h2
          id="upcoming-heading"
          className="font-board text-3xl font-bold tracking-wide uppercase"
        >
          {labels.upcoming}
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 max-w-[48ch] rounded-flap border border-paper-line bg-paper-elev px-5 py-4 text-ink-muted">
            {labels.emptyUpcoming}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-paper-line border-y border-paper-line">
            {upcoming.map((w) => renderItem(w, false))}
          </ul>
        )}
      </section>
      <section aria-labelledby="past-heading">
        <h2
          id="past-heading"
          className="font-board text-3xl font-bold tracking-wide uppercase"
        >
          {labels.past}
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 max-w-[48ch] text-ink-muted">{labels.emptyPast}</p>
        ) : (
          <ul className="mt-2 divide-y divide-paper-line border-y border-paper-line">
            {past.map((w) => renderItem(w, true))}
          </ul>
        )}
      </section>
    </div>
  );
}
