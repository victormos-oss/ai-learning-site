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
      exclude: ["**/*.d.ts", "**/index.ts", "**/*.test.*"],
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
          setupFiles: ["tests/setup.ts"],
          include: ["tests/components/**/*.test.tsx", "src/**/*.test.tsx"],
        },
      },
    ],
  },
});
