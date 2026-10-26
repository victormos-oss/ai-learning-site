import { describe, expect, it } from "vitest";
import {
  FRAME_ORIGINS,
  embedUrlFor,
  isValidVideoId,
  isVideoProvider,
  watchUrlFor,
} from "@/features/media/providers";

describe("video providers", () => {
  it("accepts only known providers", () => {
    expect(isVideoProvider("youtube")).toBe(true);
    expect(isVideoProvider("vimeo")).toBe(false);
    expect(isVideoProvider("javascript:")).toBe(false);
  });

  it("validates ids strictly and builds privacy-friendly embed urls", () => {
    expect(isValidVideoId("youtube", "dQw4w9WgXcQ")).toBe(true);
    expect(isValidVideoId("youtube", 'x"><script>')).toBe(false);
    expect(embedUrlFor("youtube", "dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0",
    );
    expect(embedUrlFor("vk", "-12345_67890")).toBe(
      "https://vk.com/video_ext.php?oid=-12345&id=67890",
    );
    expect(watchUrlFor("rutube", "a".repeat(32))).toContain("rutube.ru/video/");
  });

  it("throws on a bad id instead of producing a url", () => {
    expect(() => embedUrlFor("rutube", "not-an-id")).toThrow(/Invalid rutube/);
    expect(() => embedUrlFor("vk", "javascript:alert(1)")).toThrow();
  });

  it("exposes frame origins for the CSP", () => {
    expect(FRAME_ORIGINS).toContain("https://www.youtube-nocookie.com");
    expect(FRAME_ORIGINS.every((o) => o.startsWith("https://"))).toBe(true);
  });
});
