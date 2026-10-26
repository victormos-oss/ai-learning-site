import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { LOCALES } from "@/i18n/routing";
import { languageAlternates } from "@/features/seo/alternates";
import { getOrderedLessons, getTracks } from "@/features/content/loader";
import { resolveLesson } from "@/features/content/resolve";
import { allLessons } from "content-collections";
import type { LessonRecord } from "@/features/content/types";

const STATIC_PATHS = ["/", "/tracks", "/videos", "/webinars", "/licenses", "/progress"];

function absolute(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_SITE_URL).toString();
}

function entry(
  path: string,
  locales: readonly (typeof LOCALES)[number][],
): MetadataRoute.Sitemap[number] {
  const alternates = languageAlternates(path, locales);
  return {
    url: absolute(alternates[locales[0] ?? "en"] ?? `/en${path}`),
    alternates: {
      languages: Object.fromEntries(
        Object.entries(alternates).map(([lang, p]) => [lang, absolute(p)]),
      ),
    },
  };
}

/**
 * One row per path with hreflang alternates. Lessons list only the locales
 * that have a real translation; English-fallback pages are noindex and stay out.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lessons = allLessons as unknown as readonly LessonRecord[];
  const staticEntries = STATIC_PATHS.map((path) => entry(path, LOCALES));
  const trackEntries = getTracks().flatMap((track) => [
    entry(`/tracks/${track.slug}`, LOCALES),
    ...getOrderedLessons(track.trackDir).map((lesson) => {
      const translated = LOCALES.filter((locale) => {
        const resolved = resolveLesson(lessons, {
          trackDir: track.trackDir,
          slug: lesson.slug,
          locale,
        });
        return resolved !== null && !resolved.isFallback;
      });
      return entry(`/tracks/${track.slug}/${lesson.slug}`, translated);
    }),
  ]);
  return [...staticEntries, ...trackEntries];
}
