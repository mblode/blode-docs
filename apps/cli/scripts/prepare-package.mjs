#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(cliRoot, "../..");

const command = process.env.npm_command;
const isGlobalInstall = process.env.npm_config_global === "true";
const shouldPackage = command === "pack" || command === "publish";

const hasRepoSources =
  existsSync(path.join(repoRoot, "apps", "dev-server")) &&
  existsSync(path.join(repoRoot, "packages", "previewing"));

if (!hasRepoSources) {
  console.log("Skipping standalone package preparation outside the monorepo.");
  process.exit(0);
}

if (!shouldPackage && !isGlobalInstall) {
  process.exit(0);
}

console.log("Preparing blodemd standalone package...");

execSync("npm run build", {
  cwd: cliRoot,
  stdio: "inherit",
});

execSync("node scripts/prepare-dist.mjs", {
  cwd: cliRoot,
  stdio: "inherit",
});
