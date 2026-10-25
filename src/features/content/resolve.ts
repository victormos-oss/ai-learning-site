import type { ContentLocale } from "./schema";
import type {
  LessonRecord,
  LessonNeighbour,
  ModuleRecord,
  ResolvedLesson,
} from "./types";

/** Picks a localized string with English as the last resort. */
export function pickLocalized(
  value: Partial<Record<ContentLocale, string>> & { en: string },
  locale: ContentLocale,
): string {
  return value[locale] ?? value.en;
}

function isUsableTranslation(lesson: LessonRecord): boolean {
  if (lesson.locale === "en") return true;
  return lesson.translation?.status !== "stale";
}

/**
 * Resolves the lesson to render for a locale. Falls back to English when the
 * translation is missing or stale, and says so, so the page can render a notice
 * and the right lang attribute.
 */
export function resolveLesson(
  lessons: readonly LessonRecord[],
  params: { trackDir: string; slug: string; locale: ContentLocale },
): ResolvedLesson | null {
  const candidates = lessons.filter(
    (l) => l.trackDir === params.trackDir && l.slug === params.slug,
  );
  if (candidates.length === 0) return null;
  const exact = candidates.find((l) => l.locale === params.locale);
  if (exact && isUsableTranslation(exact)) {
    return { lesson: exact, isFallback: false, requestedLocale: params.locale };
  }
  const english = candidates.find((l) => l.locale === "en");
  if (!english) return null;
  return { lesson: english, isFallback: true, requestedLocale: params.locale };
}

/** Orders English lessons of a track by module order, then lesson order. */
export function orderTrackLessons(
  lessons: readonly LessonRecord[],
  modules: readonly ModuleRecord[],
  trackDir: string,
): LessonRecord[] {
  const moduleOrder = new Map(modules.map((m) => [m.key, m.order]));
  return lessons
    .filter((l) => l.trackDir === trackDir && l.locale === "en")
    .slice()
    .sort((a, b) => {
      const byModule =
        (moduleOrder.get(a.moduleKey) ?? 0) - (moduleOrder.get(b.moduleKey) ?? 0);
      return byModule !== 0 ? byModule : a.order - b.order;
    });
}

/** Previous and next lesson across module boundaries, by English ordering. */
export function lessonNeighbours(
  ordered: readonly LessonRecord[],
  slug: string,
): { prev: LessonNeighbour; next: LessonNeighbour } {
  const index = ordered.findIndex((l) => l.slug === slug);
  const toNeighbour = (l: LessonRecord | undefined): LessonNeighbour =>
    l ? { slug: l.slug, title: l.title } : null;
  if (index === -1) return { prev: null, next: null };
  return {
    prev: toNeighbour(ordered[index - 1]),
    next: toNeighbour(ordered[index + 1]),
  };
}
