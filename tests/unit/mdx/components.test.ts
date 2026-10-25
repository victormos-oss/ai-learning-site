import { describe, expect, it } from "vitest";
import { isAllowedDocHref } from "@/features/mdx/components/DocQuote";
import { pickFigureFile } from "@/features/mdx/components/Figure";

describe("isAllowedDocHref", () => {
  it("accepts official documentation links only", () => {
    expect(isAllowedDocHref("https://code.claude.com/docs/en/hooks")).toBe(true);
    expect(isAllowedDocHref("http://code.claude.com/docs/en/hooks")).toBe(false);
    expect(isAllowedDocHref("https://example.com/docs")).toBe(false);
    expect(isAllowedDocHref("javascript:alert(1)")).toBe(false);
  });
});

describe("pickFigureFile", () => {
  const assets = ["agent-loop.en.svg", "agent-loop.ja.svg", "plain.svg"];

  it("prefers the requested locale, then English, then a bare file", () => {
    expect(pickFigureFile("agent-loop", "en", assets)).toEqual({
      file: "agent-loop.en.svg",
      isEnglishFallback: false,
    });
    expect(pickFigureFile("agent-loop", "ru", assets)).toEqual({
      file: "agent-loop.en.svg",
      isEnglishFallback: true,
    });
    expect(pickFigureFile("plain", "es", assets)).toEqual({
      file: "plain.svg",
      isEnglishFallback: false,
    });
  });

  it("returns null when nothing matches", () => {
    expect(pickFigureFile("missing", "en", assets)).toBeNull();
  });
});
