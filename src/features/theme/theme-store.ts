import {
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  type ThemePreference,
} from "./theme-script";

const CHANGE_EVENT = "learn:theme-change";

/** Reads the preference the boot script already applied, so hydration matches. */
function readPreference(): ThemePreference {
  if (typeof document === "undefined") return "system";
  const fromDom = document.documentElement.getAttribute("data-theme-pref");
  if (isThemePreference(fromDom)) return fromDom;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function getThemeSnapshot(): ThemePreference {
  return readPreference();
}

export function getThemeServerSnapshot(): ThemePreference {
  return "system";
}

/** Re-applies the resolved theme when the OS preference changes while on "system". */
function onSystemChange(): void {
  if (readPreference() !== "system") return;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute(
    "data-theme",
    resolveTheme("system", prefersDark),
  );
}

export function subscribeTheme(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) callback();
  };
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  media.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
    media.removeEventListener("change", onSystemChange);
  };
}

export function setThemePreference(preference: ThemePreference): void {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute(
    "data-theme",
    resolveTheme(preference, prefersDark),
  );
  document.documentElement.setAttribute("data-theme-pref", preference);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable (private mode): the theme still applies to this page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
