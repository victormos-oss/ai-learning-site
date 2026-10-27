import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";

/**
 * Review captures, not assertions. Run on demand:
 *   CAPTURE=1 npx playwright test tests/e2e/visual/capture.spec.ts --project=chromium
 * Files land in .impeccable/review/<name>-<width>.png for the design review.
 */
const OUT_DIR = join(process.cwd(), ".impeccable", "review");
const PAGES = [
  { name: "home-en", path: "/en" },
  { name: "track-ru", path: "/ru/tracks/claude-code-zero" },
  { name: "lesson-en", path: "/en/tracks/claude-code-zero/agent-loop" },
  { name: "lesson-ru-fallback", path: "/ru/tracks/claude-code-zero/agent-loop" },
  { name: "progress-ru", path: "/ru/progress" },
  { name: "home-ru", path: "/ru" },
];
const WIDTHS = [1440, 390];

test.skip(!process.env.CAPTURE, "set CAPTURE=1 to record review screenshots");

for (const entry of PAGES) {
  for (const width of WIDTHS) {
    test(`capture ${entry.name} at ${width}`, async ({ page }) => {
      mkdirSync(OUT_DIR, { recursive: true });
      await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(entry.path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({
        path: join(OUT_DIR, `${entry.name}-${width}.png`),
        fullPage: true,
      });
    });
  }
}
