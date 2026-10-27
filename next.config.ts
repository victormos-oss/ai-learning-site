import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withContentCollections } from "@content-collections/next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/* Lesson assets (upstream SVGs) are served as inert documents: no scripts, no navigation. */
const CONTENT_ASSET_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },
  cacheComponents: true,
  partialPrefetching: true,
  // Playwright opens the dev server as 127.0.0.1; without this the dev server blocks
  // /_next resources from that origin and the pages never hydrate under test.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Every route reads the locale param at the top, so no app shell is shared between
    // links; the instant-navigation insight would fire on each client navigation.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: SECURITY_HEADERS },
      { source: "/content/(.*)", headers: CONTENT_ASSET_HEADERS },
    ];
  },
};

export default withContentCollections(withNextIntl(nextConfig));
