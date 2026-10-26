import type { AccessLevel, Attribution, ContentLocale } from "./schema";
import type { Quiz } from "@/features/quiz/schema";

export type LessonRecord = {
  key: string;
  slug: string;
  title: string;
  summary: string;
  order: number;
  locale: ContentLocale;
  access: AccessLevel;
  estimatedMinutes?: number;
  type: "learn" | "build" | "practice";
  quiz: boolean;
  trackDir: string;
  moduleDir: string;
  lessonDir: string;
  moduleKey: string;
  contentHash: string;
  headings: { depth: 2 | 3; text: string; id: string }[];
  /** File names inside the lesson's assets folder. */
  assets: string[];
  /** Sibling code files, pre-highlighted at build time. */
  codeFiles: Record<string, { content: string; html: string }>;
  /** Validated quiz.json for this lesson, null when absent. */
  quizData: Quiz | null;
  attribution: Attribution[];
  translation?: { status: "machine" | "reviewed" | "stale"; sourceHash: string };
  body: string;
};

export type ModuleRecord = {
  key: string;
  slug: string;
  order: number;
  access: AccessLevel;
  trackDir: string;
  moduleDir: string;
  title: Partial<Record<ContentLocale, string>> & { en: string };
  summary?: Partial<Record<ContentLocale, string>> & { en: string };
};

export type TrackRecord = {
  key: string;
  slug: string;
  order: number;
  published: boolean;
  trackDir: string;
  title: Partial<Record<ContentLocale, string>> & { en: string };
  description: Partial<Record<ContentLocale, string>> & { en: string };
};

export type ResolvedLesson = {
  lesson: LessonRecord;
  /** True when the requested locale had no usable translation and English is shown. */
  isFallback: boolean;
  requestedLocale: ContentLocale;
};

export type LessonNeighbour = { slug: string; title: string } | null;
