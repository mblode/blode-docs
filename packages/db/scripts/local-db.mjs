import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

const DEFAULT_LOCAL_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const getLocalDatabaseUrl = () =>
  process.env.LOCAL_DATABASE_URL ?? DEFAULT_LOCAL_URL;

const runDrizzle = (args) => {
  const drizzleKitEntry = require.resolve("drizzle-kit");
  const drizzleKitBin = resolve(dirname(drizzleKitEntry), "bin.cjs");
  const result = spawnSync(process.execPath, [drizzleKitBin, ...args], {
    cwd: packageRoot,
    env: {
      ...process.env,
      DATABASE_URL: getLocalDatabaseUrl(),
      NODE_PATH: "./node_modules",
    },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const runScript = (scriptPath) => {
  const result = spawnSync(
    process.execPath,
    [resolve(packageRoot, scriptPath)],
    {
      cwd: packageRoot,
      env: {
        ...process.env,
        DATABASE_URL: getLocalDatabaseUrl(),
        NODE_PATH: "./node_modules",
      },
      stdio: "inherit",
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const [command, ...restArgs] = process.argv.slice(2);

if (command === "print-url") {
  console.log(getLocalDatabaseUrl());
  process.exit(0);
}

if (command === "push") {
  runDrizzle(["push", "--config=drizzle.config.ts", ...restArgs]);
  runScript("./scripts/apply-auth-user-sync.mjs");
  process.exit(0);
}

throw new Error("Unsupported command. Use 'push' or 'print-url'.");
