#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "src/bin.ts"
);

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", cliPath, ...process.argv.slice(2)],
  {
    stdio: "inherit",
  }
);

if (result.error) {
  console.error(
    result.error instanceof Error ? result.error.message : "Failed to run CLI"
  );
  process.exit(1);
}

process.exit(result.status ?? 1);
