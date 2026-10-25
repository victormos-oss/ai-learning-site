export const THEME_STORAGE_KEY = "learn.vdmitriev.theme";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" && THEME_PREFERENCES.includes(value as ThemePreference)
  );
}

/** Pure resolution used both by the inline boot script and by React. */
export function resolveTheme(stored: unknown, prefersDark: boolean): ResolvedTheme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

/**
 * Inline boot script: sets data-theme before first paint so there is no flash.
 * Kept as a constant string so its hash can be allow-listed in a CSP.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var t=(s==="light"||s==="dark")?s:(d?"dark":"light");document.documentElement.setAttribute("data-theme",t);if(s==="light"||s==="dark"||s==="system"){document.documentElement.setAttribute("data-theme-pref",s)}}catch(e){}})();`;
