#!/usr/bin/env node
// Apply add-perf-indexes.sql against DATABASE_URL using postgres.js.
// CREATE INDEX CONCURRENTLY cannot run inside a transaction, so each
// statement is executed unwrapped. Safe to re-run — uses IF NOT EXISTS.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, "add-perf-indexes.sql");
const source = readFileSync(sqlPath, "utf8");

const statements = source
  .replaceAll(/^\s*--.*$/gm, "")
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  for (const statement of statements) {
    const label = statement.replaceAll(/\s+/g, " ").slice(0, 80);
    console.log(`→ ${label}${label.length === 80 ? "…" : ""}`);
    await sql.unsafe(statement);
  }
  console.log("Done.");
} finally {
  await sql.end({ timeout: 5 });
}
