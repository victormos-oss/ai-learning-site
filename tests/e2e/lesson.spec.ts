import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/a11y";

const LESSON = "/tracks/claude-code-zero/agent-loop";

test.describe("lesson page", () => {
  test("renders the imported lesson in English with code, figure and attribution", async ({
    page,
  }) => {
    const response = await page.goto(`/en${LESSON}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Agent Loop");
    await expect(page.getByRole("navigation", { name: "Breadcrumbs" })).toBeVisible();
    await expect(page.locator("article img").first()).toHaveAttribute("alt", /.+/);
    await expect(page.getByRole("region", { name: /Code: python/ })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /shareAI-lab\/learn-claude-code/ }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("falls back to English on Russian with a notice and noindex", async ({ page }) => {
    await page.goto(`/ru${LESSON}`);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("article")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("note").first()).toContainText(/только на английском/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expectNoA11yViolations(page);
  });

  test("track page lists the lesson and links to it", async ({ page }) => {
    await page.goto("/es/tracks/claude-code-zero");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Claude Code desde cero",
    );
    await page.getByRole("link", { name: /The Agent Loop/ }).click();
    await expect(page).toHaveURL(new RegExp(`/es${LESSON}$`));
  });
});
