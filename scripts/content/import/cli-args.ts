import { parseArgs } from "node:util";
import type { RunMode } from "./run";

export const USAGE = [
  "Usage: tsx scripts/content/import/cli.ts (--check | --apply) [options]",
  "",
  "  --check              compare upstream with sources.lock.json, exit 1 on changes",
  "  --apply              update _upstream, lock, lessons and the import report",
  "  --source <id>        only this source (default: every enabled adapt source with a mapping)",
  "  --only <key>         only this lesson key, e.g. cc-zero.agent-loop",
  "  --from-local <dir>   folder with local clones (see `local` in sources.yaml)",
].join("\n");

export interface CliArgs {
  mode: RunMode;
  sourceId?: string;
  only?: string;
  fromLocal?: string;
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      check: { type: "boolean", default: false },
      apply: { type: "boolean", default: false },
      source: { type: "string" },
      only: { type: "string" },
      "from-local": { type: "string" },
    },
    strict: true,
  });
  if (values.check === values.apply) {
    throw new Error(`Pass exactly one of --check or --apply.\n\n${USAGE}`);
  }
  return {
    mode: values.check ? "check" : "apply",
    ...(values.source ? { sourceId: values.source } : {}),
    ...(values.only ? { only: values.only } : {}),
    ...(values["from-local"] ? { fromLocal: values["from-local"] } : {}),
  };
}
