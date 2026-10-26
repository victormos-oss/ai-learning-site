import { mkdtempSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertSafeTarget,
  copyAssets,
  publicPathFor,
} from "../../../scripts/content/assets";

describe("content assets", () => {
  it("refuses to wipe a target that contains the source or looks like a root", () => {
    expect(() => assertSafeTarget("C:/proj/content/tracks", "C:/proj")).toThrow(/unsafe/);
    expect(() =>
      assertSafeTarget("C:/proj/content/tracks", "C:/proj/content/tracks"),
    ).toThrow(/unsafe/);
    expect(() => assertSafeTarget("C:/proj/content/tracks", "C:/")).toThrow(/unsafe/);
    expect(() =>
      assertSafeTarget("C:/proj/content/tracks", "C:/proj/public/content"),
    ).not.toThrow();
  });

  it("maps a lesson asset folder to its public path", () => {
    const root = join("C:", "proj", "content", "tracks");
    const dir = join(
      root,
      "cc",
      "modules",
      "02-one-agent",
      "lessons",
      "01-agent-loop",
      "assets",
    );
    expect(publicPathFor(dir, root).split(/[\\/]/)).toEqual([
      "cc",
      "02-one-agent",
      "01-agent-loop",
      "assets",
    ]);
  });

  it("copies assets and is idempotent", () => {
    const base = mkdtempSync(join(tmpdir(), "assets-"));
    const source = join(base, "tracks");
    const target = join(base, "public");
    const assetDir = join(source, "cc", "modules", "m", "lessons", "l", "assets");
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(join(assetDir, "a.svg"), "<svg/>");

    expect(copyAssets(source, target)).toBe(1);
    expect(copyAssets(source, target)).toBe(1);
    expect(readdirSync(join(target, "cc", "m", "l", "assets"))).toEqual(["a.svg"]);
  });
});
