import { parseCliArgs } from "./cli-args";
import { runImport } from "./run";

function write(line: string): void {
  process.stdout.write(`${line}\n`);
}

function main(): number {
  const args = parseCliArgs(process.argv.slice(2));
  const result = runImport({ root: process.cwd(), log: write, ...args });
  for (const source of result.sources) {
    const apply = source.apply;
    if (!apply) continue;
    write(
      `written: ${apply.written.length}, proposed: ${apply.proposed.length}, conflicts: ${apply.conflicts.length}`,
    );
    apply.warnings.forEach((warning) => write(`warning: ${warning}`));
  }
  if (result.reportPath) write(`report: ${result.reportPath}`);
  write(`exit code: ${result.exitCode}`);
  return result.exitCode;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
