import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ProgressOverview } from "@/features/progress/ProgressOverview";
import { emptyProgress } from "@/features/progress/schema";
import { markCompleted } from "@/features/progress/reducers";
import { renderWithProgressIntl, resetStoredProgress } from "./helpers";

const T = "2026-10-01T10:00:00.000Z";
const LESSONS = [
  { key: "cc-zero.agent-loop", slug: "agent-loop", title: "The Agent Loop" },
  { key: "cc-zero.tool-use", slug: "tool-use", title: "Tool Use" },
  { key: "cc-zero.permission", slug: "permission", title: "Permission" },
];

describe("ProgressOverview", () => {
  beforeEach(() => {
    resetStoredProgress();
  });

  it("shows an empty state with a native progress bar and the lesson checklist", () => {
    renderWithProgressIntl(<ProgressOverview lessons={LESSONS} trackSlug="cc" />);
    const bar = screen.getByRole("progressbar", { name: "Мой прогресс" });
    expect(bar).toHaveAttribute("value", "0");
    expect(bar).toHaveAttribute("max", "3");
    expect(screen.getByText("0 из 3 уроков (0%)")).toBeInTheDocument();
    expect(screen.getByText(/Пройденных уроков пока нет/)).toBeInTheDocument();
    expect(screen.getByText("3 урока")).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Не начат");
    expect(within(items[0]!).getByRole("link")).toHaveAttribute(
      "href",
      "/ru/tracks/cc/agent-loop",
    );
  });

  it("reflects stored completions and pluralizes in Russian", () => {
    const done = markCompleted(emptyProgress(T), "cc-zero.agent-loop", T);
    resetStoredProgress(JSON.stringify(done));
    const five = [
      ...LESSONS,
      { key: "cc-zero.hooks", slug: "hooks", title: "Hooks" },
      { key: "cc-zero.todo", slug: "todo", title: "Todo" },
    ];
    renderWithProgressIntl(<ProgressOverview lessons={five} trackSlug="cc" />);
    expect(screen.getByText("1 из 5 уроков (20%)")).toBeInTheDocument();
    expect(screen.getByText("5 уроков")).toBeInTheDocument();
    expect(screen.queryByText(/Пройденных уроков пока нет/)).toBeNull();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Пройден");
    expect(items[1]).toHaveTextContent("Не начат");
  });
});
