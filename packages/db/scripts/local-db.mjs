import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");

const DEFAULT_ADMIN_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const DEFAULT_DATABASE_NAME = "neue_docs";
const DATABASE_NAME_PATTERN = /^[a-zA-Z0-9_]+$/;

const adminUrl = process.env.LOCAL_DATABASE_ADMIN_URL ?? DEFAULT_ADMIN_URL;
const databaseName = process.env.LOCAL_DATABASE_NAME ?? DEFAULT_DATABASE_NAME;

if (!DATABASE_NAME_PATTERN.test(databaseName)) {
  throw new Error(
    "LOCAL_DATABASE_NAME must contain only letters, numbers, and underscores."
  );
}

const getLocalDatabaseUrl = () => {
  if (process.env.LOCAL_DATABASE_URL) {
    return process.env.LOCAL_DATABASE_URL;
  }

  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  url.search = "";
  url.hash = "";
  return url.toString();
};

const ensureDatabase = async () => {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  try {
    const result = await client.query(
      "select 1 from pg_database where datname = $1 limit 1",
      [databaseName]
    );

    if (result.rowCount) {
      return;
    }

    await client.query(`create database "${databaseName}"`);
  } finally {
    await client.end();
  }
};

const runDrizzle = async (args) => {
  await ensureDatabase();

  const drizzleKitEntry = require.resolve("drizzle-kit");
  const drizzleKitBin = resolve(dirname(drizzleKitEntry), "bin.cjs");
  const command = [drizzleKitBin, ...args];
  const result = spawnSync(process.execPath, command, {
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

const [command, ...restArgs] = process.argv.slice(2);

if (command === "print-url") {
  console.log(getLocalDatabaseUrl());
  process.exit(0);
}

if (command === "push") {
  await runDrizzle(["push", "--config=drizzle.config.ts", ...restArgs]);
  process.exit(0);
}

throw new Error("Unsupported command. Use 'push' or 'print-url'.");
