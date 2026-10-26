import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import {
  videosFileSchema,
  webinarsFileSchema,
  type VideoEntry,
  type WebinarEntry,
} from "./schema";

const MEDIA_DIR = join(process.cwd(), "content", "media");

function readYaml(file: string): unknown {
  return existsSync(file) ? (parse(readFileSync(file, "utf8")) ?? {}) : {};
}

export function readVideos(dir = MEDIA_DIR): VideoEntry[] {
  const parsed = videosFileSchema.safeParse(readYaml(join(dir, "videos.yaml")));
  if (!parsed.success)
    throw new Error(`content/media/videos.yaml: ${parsed.error.message}`);
  return [...parsed.data.videos].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function readWebinars(dir = MEDIA_DIR): WebinarEntry[] {
  const parsed = webinarsFileSchema.safeParse(readYaml(join(dir, "webinars.yaml")));
  if (!parsed.success) {
    throw new Error(`content/media/webinars.yaml: ${parsed.error.message}`);
  }
  return [...parsed.data.webinars].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
}
