import { describe, expect, it } from "vitest";
import {
  lessonFrontmatterSchema,
  moduleSchema,
  trackSchema,
  validateLessonForLocale,
} from "@/features/content/schema";

const attribution = {
  source: "shareAI-lab/learn-claude-code",
  path: "s01_agent_loop/README.md",
  commit: "ce8f9f1",
  license: "MIT",
  authors: "shareAI-lab contributors",
  url: "https://github.com/shareAI-lab/learn-claude-code/tree/ce8f9f1/s01_agent_loop",
  relation: "adapted",
};

const validLesson = {
  key: "cc-zero.agent-loop",
  slug: "agent-loop",
  title: "The Agent Loop",
  summary: "One loop is all you need.",
  order: 1,
  estimatedMinutes: 20,
  attribution: [attribution],
};

describe("lesson frontmatter schema", () => {
  it("accepts a minimal English lesson and applies defaults", () => {
    const parsed = lessonFrontmatterSchema.parse(validLesson);
    expect(parsed.type).toBe("learn");
    expect(parsed.quiz).toBe(false);
  });

  it("rejects a lesson without attribution", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validLesson, attribution: [] }),
    ).toThrow();
  });

  it("rejects a key without a dotted segment", () => {
    expect(() =>
      lessonFrontmatterSchema.parse({ ...validLesson, key: "agentloop" }),
    ).toThrow(/key/);
  });

  it("requires translation metadata for non-English lessons", () => {
    expect(() => validateLessonForLocale(validLesson, "ru")).toThrow(/translation/);
    const parsed = validateLessonForLocale(
      {
        ...validLesson,
        translation: {
          status: "machine",
          sourceHash: `sha256:${"a".repeat(64)}`,
        },
      },
      "ru",
    );
    expect(parsed.translation?.status).toBe("machine");
  });

  it("does not require translation metadata for English", () => {
    expect(validateLessonForLocale(validLesson, "en").key).toBe("cc-zero.agent-loop");
  });
});

describe("module and track schemas", () => {
  it("defaults module access to ACCOUNT", () => {
    const parsed = moduleSchema.parse({
      key: "cc-zero.m02",
      slug: "one-agent",
      order: 2,
      title: { en: "One agent" },
    });
    expect(parsed.access).toBe("ACCOUNT");
  });

  it("requires English title and description on a track", () => {
    expect(() =>
      trackSchema.parse({
        key: "cc-zero",
        slug: "claude-code-zero",
        order: 1,
        title: { ru: "Только русский" },
        description: { en: "x" },
      }),
    ).toThrow();
  });
});
