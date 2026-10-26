import { describe, expect, it } from "vitest";
import { groupSources, readLicenseText, readSources } from "@/features/licenses/sources";

describe("licenses sources", () => {
  const sources = readSources();

  it("reads the real registry and finds the MIT text", () => {
    expect(sources.length).toBeGreaterThan(5);
    expect(readLicenseText("MIT")).toMatch(/Permission is hereby granted/);
    expect(readLicenseText("none")).toBeNull();
  });

  it("groups sources by how they may be used", () => {
    const grouped = groupSources(sources);
    expect(grouped.adapted.map((s) => s.id)).toContain("learn-claude-code");
    expect(grouped.quoted.map((s) => s.id)).toContain("anthropic-docs");
    expect(grouped.linked.map((s) => s.id)).toContain("awesome-claude-code");
    // Disabled adapt sources are not used yet, so they are listed as links.
    expect(grouped.linked.map((s) => s.id)).toContain("ai-engineering-from-scratch");
  });

  it("every adapted source carries a copyright notice for the licenses page", () => {
    for (const source of groupSources(sources).adapted) {
      expect(source.copyright, source.id).toBeTruthy();
    }
  });
});
