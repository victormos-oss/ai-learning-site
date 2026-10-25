import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FlapText } from "@/features/board/FlapText";

describe("FlapText", () => {
  it("exposes the plain text to assistive technology and hides the plates", () => {
    render(<FlapText text="Claude Code с нуля" locale="ru" as="h1" />);
    expect(screen.getByRole("heading", { name: "Claude Code с нуля" })).toBeInTheDocument();
    const plates = document.querySelectorAll(".flap");
    expect(plates.length).toBe([..."Claude Code с нуля"].length);
    expect(plates[0]?.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("uppercases plates with the locale and marks spaces", () => {
    render(<FlapText text="цикл агента" locale="ru" />);
    const chars = [...document.querySelectorAll(".flap")].map((el) =>
      el.getAttribute("data-char"),
    );
    expect(chars.join("")).toBe("ЦИКЛ АГЕНТА");
    expect(document.querySelector(".flap[data-space='true']")).not.toBeNull();
  });

  it("applies the amber tone", () => {
    render(<FlapText text="Go" tone="amber" />);
    expect(document.querySelector(".flap[data-tone='amber']")).not.toBeNull();
  });
});
