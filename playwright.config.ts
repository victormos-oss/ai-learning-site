import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const IS_CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  // The local dev server compiles routes on first hit; too many parallel cold hits abort navigations.
  workers: IS_CI ? undefined : 2,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 1,
  reporter: IS_CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    locale: "en-US",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: IS_CI ? `npm run start -- --port ${PORT}` : `npm run dev -- --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !IS_CI,
    timeout: 180_000,
  },
});
