import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ImportExport } from "@/features/progress/ImportExport";
import { emptyProgress, type ProgressState } from "@/features/progress/schema";
import { markCompleted } from "@/features/progress/reducers";
import { serializeExport } from "@/features/progress/export";
import {
  readStoredProgress,
  renderWithProgressIntl,
  resetStoredProgress,
} from "./helpers";

const T = "2026-10-01T10:00:00.000Z";

describe("ImportExport", () => {
  beforeEach(() => {
    resetStoredProgress();
  });

  it("resets progress only after a second confirmation step", async () => {
    const user = userEvent.setup();
    const done = markCompleted(emptyProgress(T), "cc-zero.agent-loop", T);
    resetStoredProgress(JSON.stringify(done));
    renderWithProgressIntl(<ImportExport />);

    await user.click(screen.getByRole("button", { name: "Сбросить прогресс" }));
    expect(screen.getByText("Удалить весь прогресс в этом браузере?")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.queryByText("Удалить весь прогресс в этом браузере?")).toBeNull();
    expect((readStoredProgress() as ProgressState).lessons).toEqual(done.lessons);

    await user.click(screen.getByRole("button", { name: "Сбросить прогресс" }));
    await user.click(screen.getByRole("button", { name: "Да, удалить" }));
    expect((readStoredProgress() as ProgressState).lessons).toEqual({});
  });

  it("imports a valid export file and reports the lesson count", async () => {
    const user = userEvent.setup();
    renderWithProgressIntl(<ImportExport />);
    const incoming = markCompleted(emptyProgress(T), "cc-zero.agent-loop", T);
    const file = new File([serializeExport(incoming, new Date(T))], "p.json", {
      type: "application/json",
    });

    await user.upload(screen.getByLabelText("Загрузить прогресс"), file);
    await waitFor(() =>
      expect(screen.getByText("Прогресс загружен: 1 уроков")).toBeInTheDocument(),
    );
    expect((readStoredProgress() as ProgressState).lessons).toEqual(incoming.lessons);
  });

  it("rejects a foreign file with a visible message", async () => {
    const user = userEvent.setup();
    renderWithProgressIntl(<ImportExport />);
    const file = new File(['{"format":"other"}'], "x.json", { type: "application/json" });

    await user.upload(screen.getByLabelText("Загрузить прогресс"), file);
    await waitFor(() =>
      expect(screen.getByText(/не является выгрузкой прогресса/)).toBeInTheDocument(),
    );
  });
});
