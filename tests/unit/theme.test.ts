import { describe, expect, it } from "vitest";
import {
  THEME_BOOT_SCRIPT,
  isThemePreference,
  resolveTheme,
} from "@/features/theme/theme-script";

describe("resolveTheme", () => {
  it("honours an explicit stored preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("falls back to the system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("garbage", true)).toBe("dark");
  });
});

describe("isThemePreference", () => {
  it("accepts only the three known values", () => {
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
  });
});

describe("THEME_BOOT_SCRIPT", () => {
  it("is a single self-contained statement without newlines", () => {
    expect(THEME_BOOT_SCRIPT.includes("\n")).toBe(false);
    expect(THEME_BOOT_SCRIPT.startsWith("(function(){")).toBe(true);
    expect(THEME_BOOT_SCRIPT.endsWith("})();")).toBe(true);
  });
});
