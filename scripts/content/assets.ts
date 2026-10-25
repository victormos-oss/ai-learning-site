/**
 * Copies lesson assets from content/tracks/** /assets into public/content so
 * Next can serve them. Runs before dev and build. Idempotent.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const SOURCE_ROOT = join(process.cwd(), "content", "tracks");
const TARGET_ROOT = join(process.cwd(), "public", "content");

function findAssetDirs(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === "assets") {
      found.push(full);
      continue;
    }
    findAssetDirs(full, found);
  }
  return found;
}

/** /tracks/<track>/modules/<module>/lessons/<lesson>/assets -> <track>/<module>/<lesson>/assets */
export function publicPathFor(assetDir: string, sourceRoot = SOURCE_ROOT): string {
  const rel = relative(sourceRoot, assetDir).split(sep);
  const [track, , moduleDir, , lessonDir] = rel;
  if (!track || !moduleDir || !lessonDir) {
    throw new Error(`Unexpected asset location: ${assetDir}`);
  }
  return join(track, moduleDir, lessonDir, "assets");
}

export function copyAssets(sourceRoot = SOURCE_ROOT, targetRoot = TARGET_ROOT): number {
  if (!existsSync(sourceRoot)) return 0;
  rmSync(targetRoot, { recursive: true, force: true });
  let copied = 0;
  for (const assetDir of findAssetDirs(sourceRoot)) {
    const target = join(targetRoot, publicPathFor(assetDir, sourceRoot));
    mkdirSync(target, { recursive: true });
    cpSync(assetDir, target, { recursive: true });
    copied += readdirSync(assetDir).length;
  }
  return copied;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/content/assets.ts");
if (isDirectRun) {
  const count = copyAssets();
  console.log(`content assets: ${count} file(s) copied to public/content`);
}
