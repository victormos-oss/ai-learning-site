import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const WCAG_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

type A11yOptions = {
  /** CSS selectors to exclude from the scan, e.g. third-party iframes. */
  exclude?: string[];
  /** Rule ids allowed to fail, each with a reason; keep this list short. */
  allow?: Record<string, string>;
};

export async function expectNoA11yViolations(
  page: Page,
  options: A11yOptions = {},
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector);
  }
  const results = await builder.analyze();
  const allowed = new Set(Object.keys(options.allow ?? {}));
  const blocking = results.violations.filter(
    (violation) =>
      BLOCKING_IMPACTS.has(violation.impact ?? "") && !allowed.has(violation.id),
  );
  const summary = blocking
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help}\n` +
        violation.nodes
          .slice(0, 3)
          .map((node) => `  ${node.target.join(" ")}`)
          .join("\n"),
    )
    .join("\n\n");
  expect(blocking, summary).toHaveLength(0);
}
