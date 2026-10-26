import { describe, expect, it } from "vitest";
import { canonicalFor, languageAlternates } from "@/features/seo/alternates";

describe("seo alternates", () => {
  it("lists every locale and an x-default on English", () => {
    expect(languageAlternates("/tracks")).toEqual({
      en: "/en/tracks",
      ru: "/ru/tracks",
      es: "/es/tracks",
      "x-default": "/en/tracks",
    });
  });

  it("handles the root path without a trailing slash", () => {
    expect(languageAlternates("/")).toEqual({
      en: "/en",
      ru: "/ru",
      es: "/es",
      "x-default": "/en",
    });
    expect(canonicalFor("ru", "/")).toBe("/ru");
  });

  it("omits locales without usable content", () => {
    const alternates = languageAlternates("/tracks/t/l", ["en"]);
    expect(Object.keys(alternates)).toEqual(["en", "x-default"]);
  });
});
