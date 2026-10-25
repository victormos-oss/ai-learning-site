"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type AnnounceFn = (message: string) => void;

const AnnouncerContext = createContext<AnnounceFn>(() => {});

const CLEAR_DELAY_MS = 50;

/**
 * One polite live region for the whole app, present in the DOM from the
 * first render. Repeating the same message still announces: the text is
 * cleared, then written again on the next tick.
 */
export function AnnouncerProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<number | null>(null);

  const announce = useCallback<AnnounceFn>((next) => {
    setMessage("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(next), CLEAR_DELAY_MS);
  }, []);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnounce(): AnnounceFn {
  return useContext(AnnouncerContext);
}
