import { z } from "zod";
import { isValidVideoId, isVideoProvider } from "./providers";

const localizedText = z.object({
  en: z.string().min(1),
  ru: z.string().min(1).optional(),
  es: z.string().min(1).optional(),
});

const videoRef = z
  .object({
    provider: z.string().refine(isVideoProvider, "unknown video provider"),
    id: z.string().min(1),
  })
  .refine(
    (v) => isVideoProvider(v.provider) && isValidVideoId(v.provider, v.id),
    "video id does not match the provider's format",
  );

export const videoSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: localizedText,
  description: localizedText.optional(),
  video: videoRef,
  /** Path under /public for the poster shown before the iframe loads. */
  poster: z.string().startsWith("/").optional(),
  durationMinutes: z.number().int().positive().optional(),
  publishedAt: z.string().date(),
});
export type VideoEntry = z.infer<typeof videoSchema>;

export const webinarSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  title: localizedText,
  description: localizedText.optional(),
  /** ISO 8601 with offset, e.g. 2026-11-20T19:00:00+03:00 */
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().positive().default(60),
  registrationUrl: z.string().url().startsWith("https://").optional(),
  recording: videoRef.optional(),
});
export type WebinarEntry = z.infer<typeof webinarSchema>;

export const videosFileSchema = z.object({ videos: z.array(videoSchema).default([]) });
export const webinarsFileSchema = z.object({
  webinars: z.array(webinarSchema).default([]),
});
