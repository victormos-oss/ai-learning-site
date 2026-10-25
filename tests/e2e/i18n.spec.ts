import { expect, test } from "@playwright/test";

test.describe("i18n routing", () => {
  test("russian route sets the document language", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });

  test("root redirects by Accept-Language", async ({ browser }) => {
    const context = await browser.newContext({ locale: "es-ES" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await context.close();
  });

  test("unknown locale prefix is a 404", async ({ page }) => {
    const response = await page.goto("/de/anything");
    expect(response?.status()).toBe(404);
  });

  test("language switcher keeps the path and marks the current language", async ({
    page,
  }) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", { name: "Language" });
    await expect(nav.getByRole("link", { name: /English/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await nav.getByRole("link", { name: /Русский/ }).click();
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  });
});
