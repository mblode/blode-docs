// Apply Drizzle migrations from packages/db/drizzle to the configured database.
//
// Drizzle Kit beta best practice: migrations are SQL files committed to the
// repo. drizzle-orm's migrator queries `drizzle.__drizzle_migrations` for the
// applied set, then executes any pending migration files in lexical order.
//
// This script also handles **baselining** for environments whose schema was
// originally created via `drizzle-kit push` (no migration journal). On the
// first run, if `public.users` already exists but the migration journal is
// empty, every migration file is recorded as already-applied so the migrator
// will not re-run `CREATE TABLE` against existing tables.
//
// Connection precedence: DIRECT_URL > POSTGRES_URL_NON_POOLING > DATABASE_URL.
// Prefer the direct (non-pooled) URL where possible; the pooler's transaction
// mode breaks prepared statements that drizzle-orm uses internally.

import crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const databaseUrl =
  process.env.DIRECT_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DIRECT_URL, POSTGRES_URL_NON_POOLING, or DATABASE_URL is required."
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = join(here, "..", "drizzle");

if (!existsSync(migrationsFolder)) {
  throw new Error(
    `Migrations folder not found at ${migrationsFolder}. Run \`npm run db:generate -w @repo/db\` first.`
  );
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });
const db = drizzle(sql);

const hashMigration = (folder) => {
  const sqlPath = join(migrationsFolder, folder, "migration.sql");
  return crypto
    .createHash("sha256")
    .update(readFileSync(sqlPath, "utf8"))
    .digest("hex");
};

const tableExists = async (schema, table) => {
  const [row] = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = ${schema}
        and table_name = ${table}
    ) as "exists"
  `;
  return Boolean(row?.exists);
};

// Baseline: if public.users already exists (i.e. the schema was originally
// created via drizzle-kit push) but drizzle.__drizzle_migrations is empty,
// record every migration file as already-applied so migrate() skips them.
const ensureBaseline = async () => {
  const journalExists = await tableExists("drizzle", "__drizzle_migrations");
  if (journalExists) {
    const [counted] = await sql`
      select count(*)::int as count
      from drizzle.__drizzle_migrations
    `;
    if ((counted?.count ?? 0) > 0) {
      return;
    }
  }

  const usersExists = await tableExists("public", "users");
  if (!usersExists) {
    return;
  }

  const folders = readdirSync(migrationsFolder)
    .filter((name) => existsSync(join(migrationsFolder, name, "migration.sql")))
    .toSorted((a, b) => a.localeCompare(b));

  if (folders.length === 0) {
    return;
  }

  await sql`create schema if not exists drizzle`;
  await sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `;

  for (const folder of folders) {
    const datePart = folder.slice(0, 14);
    const year = Number.parseInt(datePart.slice(0, 4), 10);
    const month = Number.parseInt(datePart.slice(4, 6), 10) - 1;
    const day = Number.parseInt(datePart.slice(6, 8), 10);
    const hour = Number.parseInt(datePart.slice(8, 10), 10);
    const minute = Number.parseInt(datePart.slice(10, 12), 10);
    const second = Number.parseInt(datePart.slice(12, 14), 10);
    const millis = Date.UTC(year, month, day, hour, minute, second);

    await sql`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hashMigration(folder)}, ${millis})
    `;
  }

  console.log(
    `Baseline complete: marked ${folders.length} existing migration(s) as applied.`
  );
};

try {
  await ensureBaseline();
  await migrate(db, { migrationsFolder });
  console.log("Migrations applied.");
} finally {
  await sql.end({ timeout: 5 });
}
