/* Lighthouse CI: mobile profile on the landing, a track and a lesson in each language. */
const PORT = 3100;
const BASE = `http://127.0.0.1:${PORT}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npm run start -- --port ${PORT}`,
      startServerReadyPattern: "Ready in",
      url: [
        `${BASE}/ru`,
        `${BASE}/en/tracks/claude-code-zero`,
        `${BASE}/en/tracks/claude-code-zero/agent-loop`,
        `${BASE}/es/tracks`,
      ],
      numberOfRuns: 1,
      settings: { preset: "mobile" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
