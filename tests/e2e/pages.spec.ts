import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/a11y";

test.describe("secondary pages", () => {
  test("licenses page lists adapted sources and the MIT text", async ({ page }) => {
    await page.goto("/ru/licenses");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Лицензии и источники",
    );
    await expect(
      page.getByRole("link", { name: /learn-claude-code/ }).first(),
    ).toBeVisible();
    await expect(page.getByText(/Permission is hereby granted/)).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("videos and webinars show honest empty states", async ({ page }) => {
    await page.goto("/en/videos");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Videos");
    await expect(page.getByText(/No videos yet/)).toBeVisible();
    expect(await page.locator("iframe").count()).toBe(0);
    await expectNoA11yViolations(page);

    await page.goto("/es/webinars");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Webinars");
    await expect(page.getByText(/No hay webinars programados/)).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("tracks index links to the first track", async ({ page }) => {
    await page.goto("/en/tracks");
    await page.getByRole("link", { name: /Claude Code from zero/ }).click();
    await expect(page).toHaveURL(/\/en\/tracks\/claude-code-zero$/);
    await expectNoA11yViolations(page);
  });
});
