/**
 * Only these providers may be embedded, and only by a validated id. Arbitrary
 * URLs never reach an iframe, which keeps the CSP frame-src list short and
 * closes iframe injection through content files.
 */
export type VideoProvider = "youtube" | "rutube" | "vk";

type ProviderSpec = {
  idPattern: RegExp;
  embedUrl: (id: string) => string;
  watchUrl: (id: string) => string;
  /** Origin to allow in the CSP frame-src directive. */
  frameOrigin: string;
};

const PROVIDERS: Record<VideoProvider, ProviderSpec> = {
  youtube: {
    idPattern: /^[A-Za-z0-9_-]{11}$/,
    embedUrl: (id) => `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
    watchUrl: (id) => `https://www.youtube.com/watch?v=${id}`,
    frameOrigin: "https://www.youtube-nocookie.com",
  },
  rutube: {
    idPattern: /^[a-f0-9]{32}$/,
    embedUrl: (id) => `https://rutube.ru/play/embed/${id}`,
    watchUrl: (id) => `https://rutube.ru/video/${id}/`,
    frameOrigin: "https://rutube.ru",
  },
  vk: {
    // "-123456_789012" (owner id, underscore, video id)
    idPattern: /^-?\d{1,12}_\d{1,12}$/,
    embedUrl: (id) => {
      const [oid, vid] = id.split("_");
      return `https://vk.com/video_ext.php?oid=${oid}&id=${vid}`;
    },
    watchUrl: (id) => `https://vk.com/video${id}`,
    frameOrigin: "https://vk.com",
  },
};

export const VIDEO_PROVIDERS = Object.keys(PROVIDERS) as VideoProvider[];
export const FRAME_ORIGINS = VIDEO_PROVIDERS.map((p) => PROVIDERS[p].frameOrigin);

export function isVideoProvider(value: unknown): value is VideoProvider {
  return typeof value === "string" && value in PROVIDERS;
}

export function isValidVideoId(provider: VideoProvider, id: string): boolean {
  return PROVIDERS[provider].idPattern.test(id);
}

export function embedUrlFor(provider: VideoProvider, id: string): string {
  if (!isValidVideoId(provider, id))
    throw new Error(`Invalid ${provider} video id: ${id}`);
  return PROVIDERS[provider].embedUrl(id);
}

export function watchUrlFor(provider: VideoProvider, id: string): string {
  if (!isValidVideoId(provider, id))
    throw new Error(`Invalid ${provider} video id: ${id}`);
  return PROVIDERS[provider].watchUrl(id);
}
