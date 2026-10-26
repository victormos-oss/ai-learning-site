/**
 * Copies lesson assets from content/tracks/** /assets into public/content so
 * Next can serve them. Runs before dev and build. Idempotent.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const SOURCE_ROOT = join(process.cwd(), "content", "tracks");
const TARGET_ROOT = join(process.cwd(), "public", "content");

function findAssetDirs(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue; // symlinks are skipped on purpose
    const full = join(dir, entry.name);
    if (entry.name === "assets") {
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

/** The target is wiped before copying, so it must be a dedicated folder, never a parent of the source. */
export function assertSafeTarget(sourceRoot: string, targetRoot: string): void {
  const source = resolve(sourceRoot);
  const target = resolve(targetRoot);
  const isParentOfSource = source === target || source.startsWith(target + sep);
  const isRootLike =
    target === resolve("/") || target.split(sep).filter(Boolean).length < 2;
  if (isParentOfSource || isRootLike) {
    throw new Error(`Refusing to wipe unsafe asset target: ${target}`);
  }
}

export function copyAssets(sourceRoot = SOURCE_ROOT, targetRoot = TARGET_ROOT): number {
  if (!existsSync(sourceRoot)) return 0;
  assertSafeTarget(sourceRoot, targetRoot);
  rmSync(targetRoot, { recursive: true, force: true });
  let copied = 0;
  for (const assetDir of findAssetDirs(sourceRoot)) {
    const target = join(targetRoot, publicPathFor(assetDir, sourceRoot));
    mkdirSync(target, { recursive: true });
    cpSync(assetDir, target, { recursive: true, dereference: false });
    copied += readdirSync(assetDir).length;
  }
  return copied;
}

const isDirectRun = process.argv[1]
  ?.replace(/\\/g, "/")
  .endsWith("scripts/content/assets.ts");
if (isDirectRun) {
  const count = copyAssets();
  console.log(`content assets: ${count} file(s) copied to public/content`);
}
