import { describe, expect, it } from "vitest";
import {
  lessonNeighbours,
  orderTrackLessons,
  pickLocalized,
  resolveLesson,
} from "@/features/content/resolve";
import type { LessonRecord, ModuleRecord } from "@/features/content/types";

function lesson(
  partial: Partial<LessonRecord> & Pick<LessonRecord, "slug" | "locale">,
): LessonRecord {
  return {
    key: `cc-zero.${partial.slug}`,
    title: partial.slug,
    summary: "",
    order: 1,
    access: "ACCOUNT",
    type: "learn",
    quiz: false,
    trackDir: "claude-code-zero",
    moduleDir: "02-one-agent",
    lessonDir: `01-${partial.slug}`,
    moduleKey: "cc-zero.m02",
    contentHash: "sha256:x",
    headings: [],
    assets: [],
    codeFiles: {},
    attribution: [],
    body: "",
    ...partial,
  };
}

const modules: ModuleRecord[] = [
  {
    key: "cc-zero.m02",
    slug: "one-agent",
    order: 2,
    access: "ACCOUNT",
    trackDir: "claude-code-zero",
    moduleDir: "02-one-agent",
    title: { en: "m2" },
  },
  {
    key: "cc-zero.m03",
    slug: "context",
    order: 3,
    access: "ACCOUNT",
    trackDir: "claude-code-zero",
    moduleDir: "03-context",
    title: { en: "m3" },
  },
];

describe("resolveLesson", () => {
  const en = lesson({ slug: "agent-loop", locale: "en" });
  const ruStale = lesson({
    slug: "agent-loop",
    locale: "ru",
    translation: { status: "stale", sourceHash: "sha256:old" },
  });
  const ruOk = lesson({
    slug: "agent-loop",
    locale: "ru",
    translation: { status: "machine", sourceHash: "sha256:x" },
  });

  it("returns the exact locale when the translation is usable", () => {
    const resolved = resolveLesson([en, ruOk], {
      trackDir: "claude-code-zero",
      slug: "agent-loop",
      locale: "ru",
    });
    expect(resolved?.isFallback).toBe(false);
    expect(resolved?.lesson.locale).toBe("ru");
  });

  it("falls back to English when the translation is missing or stale", () => {
    const missing = resolveLesson([en], {
      trackDir: "claude-code-zero",
      slug: "agent-loop",
      locale: "es",
    });
    expect(missing?.isFallback).toBe(true);
    expect(missing?.lesson.locale).toBe("en");
    const stale = resolveLesson([en, ruStale], {
      trackDir: "claude-code-zero",
      slug: "agent-loop",
      locale: "ru",
    });
    expect(stale?.isFallback).toBe(true);
  });

  it("returns null for an unknown slug", () => {
    expect(
      resolveLesson([en], { trackDir: "claude-code-zero", slug: "nope", locale: "en" }),
    ).toBeNull();
  });
});

describe("ordering and neighbours", () => {
  const ordered = orderTrackLessons(
    [
      lesson({ slug: "memory", locale: "en", moduleKey: "cc-zero.m03", order: 3 }),
      lesson({ slug: "tool-use", locale: "en", order: 2 }),
      lesson({ slug: "agent-loop", locale: "en", order: 1 }),
      lesson({ slug: "agent-loop", locale: "ru", order: 1 }),
    ],
    modules,
    "claude-code-zero",
  );

  it("orders by module then lesson and ignores translations", () => {
    expect(ordered.map((l) => l.slug)).toEqual(["agent-loop", "tool-use", "memory"]);
  });

  it("finds neighbours across module boundaries", () => {
    expect(lessonNeighbours(ordered, "tool-use")).toEqual({
      prev: { slug: "agent-loop", title: "agent-loop" },
      next: { slug: "memory", title: "memory" },
    });
    expect(lessonNeighbours(ordered, "agent-loop").prev).toBeNull();
    expect(lessonNeighbours(ordered, "memory").next).toBeNull();
  });
});

describe("pickLocalized", () => {
  it("prefers the locale and falls back to English", () => {
    expect(pickLocalized({ en: "Hi", ru: "Привет" }, "ru")).toBe("Привет");
    expect(pickLocalized({ en: "Hi", ru: "Привет" }, "es")).toBe("Hi");
  });
});
