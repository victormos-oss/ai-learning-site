import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/a11y";

test.describe("smoke", () => {
  test("english home page responds and is well-formed", async ({ page }) => {
    const response = await page.goto("/en");
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expectNoA11yViolations(page);
  });

  test("health endpoint answers", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});
