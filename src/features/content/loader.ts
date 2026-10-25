import { allLessons, allModules, allTracks } from "content-collections";
import type { ContentLocale } from "./schema";
import { lessonNeighbours, orderTrackLessons, resolveLesson } from "./resolve";
import type { LessonRecord, ModuleRecord, ResolvedLesson, TrackRecord } from "./types";

/*
 * The only module that touches the generated collections. Everything else
 * works with the plain record types, so swapping the MDX toolchain later
 * means changing this file alone.
 */

const lessons = allLessons as unknown as readonly LessonRecord[];
const modules = allModules as unknown as readonly ModuleRecord[];
const tracks = allTracks as unknown as readonly TrackRecord[];

export function getTracks(): TrackRecord[] {
  return tracks
    .filter((t) => t.published)
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function getTrackBySlug(slug: string): TrackRecord | null {
  return tracks.find((t) => t.slug === slug && t.published) ?? null;
}

export function getModulesForTrack(trackDir: string): ModuleRecord[] {
  return modules
    .filter((m) => m.trackDir === trackDir)
    .slice()
    .sort((a, b) => a.order - b.order);
}

export function getOrderedLessons(trackDir: string): LessonRecord[] {
  return orderTrackLessons(lessons, modules, trackDir);
}

export function getLesson(params: {
  trackSlug: string;
  lessonSlug: string;
  locale: ContentLocale;
}): (ResolvedLesson & { neighbours: ReturnType<typeof lessonNeighbours> }) | null {
  const track = getTrackBySlug(params.trackSlug);
  if (!track) return null;
  const resolved = resolveLesson(lessons, {
    trackDir: track.trackDir,
    slug: params.lessonSlug,
    locale: params.locale,
  });
  if (!resolved) return null;
  const neighbours = lessonNeighbours(
    getOrderedLessons(track.trackDir),
    params.lessonSlug,
  );
  return { ...resolved, neighbours };
}

/** All (track, lesson) pairs for static generation; locales are added by the page. */
export function getLessonParams(): { track: string; lesson: string }[] {
  return getTracks().flatMap((track) =>
    getOrderedLessons(track.trackDir).map((l) => ({ track: track.slug, lesson: l.slug })),
  );
}
