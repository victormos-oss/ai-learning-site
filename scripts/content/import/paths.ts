import { join } from "node:path";
import { lessonDirName, type MappingEntry } from "../lib/mapping-schema";

/** Absolute locations of the content pipeline files for a project root. */
export interface ProjectPaths {
  root: string;
  sourcesFile: string;
  mappingDir: string;
  lockFile: string;
  upstreamDir: string;
  tracksDir: string;
  reportsDir: string;
}

export function projectPaths(root: string): ProjectPaths {
  const content = join(root, "content");
  return {
    root,
    sourcesFile: join(content, "sources", "sources.yaml"),
    mappingDir: join(content, "sources", "mapping"),
    lockFile: join(content, "sources", "sources.lock.json"),
    upstreamDir: join(content, "_upstream"),
    tracksDir: join(content, "tracks"),
    reportsDir: join(content, "reports"),
  };
}

export function mappingFile(paths: ProjectPaths, sourceId: string): string {
  return join(paths.mappingDir, `${sourceId}.yaml`);
}

/** `content/_upstream/<source>/<path>` */
export function upstreamFile(paths: ProjectPaths, sourceId: string, relativePath: string): string {
  return join(paths.upstreamDir, sourceId, relativePath);
}

/** `content/tracks/<track>/modules/<module>/lessons/<NN>-<slug>` */
export function lessonDir(paths: ProjectPaths, track: string, entry: MappingEntry): string {
  return join(paths.tracksDir, track, "modules", entry.module, "lessons", lessonDirName(entry));
}

export function reportFile(paths: ProjectPaths, date: Date): string {
  return join(paths.reportsDir, `import-${date.toISOString().slice(0, 10)}.md`);
}
