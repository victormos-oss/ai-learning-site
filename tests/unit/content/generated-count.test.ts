import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allLessons, allModules, allTracks } from "content-collections";

/*
 * content-collections drops a document whose frontmatter fails to parse
 * without failing the build. These counts turn such a drop into a red test.
 */
const TRACKS_DIR = join(process.cwd(), "content", "tracks");

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isDirectory());
}

function countFiles(dir: string, pattern: RegExp): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((name) => pattern.test(name)).length;
}

const trackDirs = subdirs(TRACKS_DIR);
const moduleDirs = trackDirs.flatMap((track) => subdirs(join(track, "modules")));
const lessonDirs = moduleDirs.flatMap((module) => subdirs(join(module, "lessons")));

describe("generated collections cover every content file", () => {
  it("has one track document per track.yaml", () => {
    const expected = trackDirs.filter((dir) =>
      existsSync(join(dir, "track.yaml")),
    ).length;
    expect(allTracks).toHaveLength(expected);
  });

  it("has one module document per module.yaml", () => {
    const expected = moduleDirs.filter((dir) =>
      existsSync(join(dir, "module.yaml")),
    ).length;
    expect(allModules).toHaveLength(expected);
  });

  it("has one lesson document per lesson mdx file", () => {
    const expected = lessonDirs.reduce(
      (sum, dir) => sum + countFiles(dir, /^(en|ru|es)\.mdx$/),
      0,
    );
    expect(expected).toBeGreaterThan(0);
    const missing = lessonDirs
      .filter((dir) => existsSync(join(dir, "en.mdx")))
      .map((dir) => dir.split(/[\\/]/).at(-1) ?? dir)
      .filter((slugDir) => !allLessons.some((lesson) => slugDir.endsWith(lesson.slug)));
    expect(missing).toEqual([]);
    expect(allLessons).toHaveLength(expected);
  });
});
