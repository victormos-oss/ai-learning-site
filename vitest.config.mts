import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const COVERAGE_THRESHOLD = 80;

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/features/**", "src/lib/**", "scripts/**"],
      // Thresholds apply to logic. React components are exercised by the
      // component project and by Playwright + axe end to end; the content
      // loader only re-exports generated collections.
      exclude: [
        "**/*.d.ts",
        "**/index.ts",
        "**/index.tsx",
        "**/*.test.*",
        "**/*.tsx",
        "src/features/content/loader.ts",
        "src/features/content/types.ts",
      ],
      thresholds: {
        lines: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        branches: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts", "scripts/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          // The forks pool times out starting jsdom workers on Windows; threads start reliably.
          pool: "threads",
          setupFiles: ["tests/setup.ts"],
          include: ["tests/components/**/*.test.tsx", "src/**/*.test.tsx"],
        },
      },
    ],
  },
});
