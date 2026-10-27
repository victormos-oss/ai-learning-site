import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/a11y";

test.describe("landing board", () => {
  test("shows the track as a departures board with the first lesson departing", async ({
    page,
  }) => {
    await page.goto("/ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Claude Code с нуля",
    );
    const board = page.getByRole("region", { name: "Табло отправлений" });
    const firstRow = board.getByRole("link").first();
    await expect(firstRow).toHaveAttribute(
      "href",
      /\/ru\/tracks\/claude-code-zero\/install$/,
    );
    await expect(firstRow).toHaveAccessibleName(/01 .*Отправляется/);
    await expectNoA11yViolations(page);
  });

  test("language flag switches the locale and keeps the board", async ({ page }) => {
    await page.goto("/en");
    const flag = page.getByRole("navigation", { name: "Language" });
    await flag.getByRole("link", { name: /Español/ }).click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Claude Code desde cero",
    );
  });

  test("reduced motion skips the flip and navigates immediately", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await page
      .getByRole("navigation", { name: "Language" })
      .getByRole("link", { name: /Русский/ })
      .click();
    await expect(page).toHaveURL(/\/ru$/);
    // Only the board plates matter here; dev-tool overlays may animate on their own.
    const running = await page.evaluate(
      () =>
        document.getAnimations().filter((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return target instanceof Element && target.closest(".flap-text") !== null;
        }).length,
    );
    expect(running).toBe(0);
  });
});
