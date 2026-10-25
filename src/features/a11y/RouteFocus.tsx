"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * After a client-side navigation, moves focus to the page heading (or main)
 * so keyboard and screen-reader users land on the new content. The first
 * render is left alone: the browser already starts at the top.
 */
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current === null) {
      previous.current = pathname;
      return;
    }
    if (previous.current === pathname) return;
    previous.current = pathname;

    const heading = document.querySelector<HTMLElement>("main h1");
    const target = heading ?? document.getElementById("content");
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: false });
  }, [pathname]);

  return null;
}
