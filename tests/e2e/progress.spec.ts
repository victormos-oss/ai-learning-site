import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./helpers/a11y";

const TRACK = "/ru/tracks/claude-code-zero";
const LESSON = `${TRACK}/agent-loop`;

test.describe("lesson progress", () => {
  test("marking a lesson survives a reload and shows on the progress and track pages", async ({
    page,
  }) => {
    await page.goto(LESSON);
    const button = page.getByRole("button", { name: "Отметить пройденным" });
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await button.click();
    // The label changes with the state, so the pressed button has a new accessible name.
    const done = page.getByRole("button", { name: /^Пройден/ });
    await expect(done).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("status").filter({ hasText: "Урок отмечен как пройденный" }),
    ).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole("button", { name: /Пройден/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goto("/ru/progress");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Мой прогресс");
    await expect(page.getByText(/^1 из \d+ уроков \(\d+%\)$/)).toBeVisible();
    const bar = page.getByRole("progressbar", { name: "Мой прогресс" });
    await expect(bar).toHaveAttribute("value", "1");
    const item = page.getByRole("listitem").filter({ hasText: "The Agent Loop" });
    await expect(item).toContainText("Пройден");
    const untouched = page.getByRole("listitem").filter({ hasText: "Getting Started" });
    await expect(untouched).toContainText("Не начат");
    await expectNoA11yViolations(page);

    await page.goto(TRACK);
    const lessonLink = page.getByRole("link", { name: /The Agent Loop/ });
    await expect(lessonLink).toContainText("Пройден");
    await expectNoA11yViolations(page);
  });

  test("progress page starts empty and the reset asks for confirmation", async ({
    page,
  }) => {
    await page.goto("/ru/progress");
    await expect(page.getByText(/^0 из \d+ уроков \(0%\)$/)).toBeVisible();
    await expect(page.getByText(/Пройденных уроков пока нет/)).toBeVisible();
    await expect(page.getByLabel("Загрузить прогресс")).toHaveAttribute("type", "file");

    await page.getByRole("button", { name: "Сбросить прогресс" }).click();
    await expect(page.getByText("Удалить весь прогресс в этом браузере?")).toBeVisible();
    await page.getByRole("button", { name: "Отмена" }).click();
    await expect(page.getByText("Удалить весь прогресс в этом браузере?")).toBeHidden();
    await expectNoA11yViolations(page);
  });
});
