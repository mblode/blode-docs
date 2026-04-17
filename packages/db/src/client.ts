import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

// DATABASE_URL is absent during `next build` page-data collection. We keep
// the throw for runtime so misconfigured deploys fail loudly, but accept a
// placeholder during build so importing this module doesn't crash. The
// placeholder never connects (postgres.js is lazy) and no queries execute
// during build.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const connectionString = process.env.DATABASE_URL ?? null;

if (!connectionString && !isBuildPhase) {
  throw new Error("DATABASE_URL is required.");
}

// Tuned for Vercel Fluid Compute + Supabase pgbouncer (transaction pooler).
// `prepare: false` is required for pgbouncer transaction mode.
// `max: 1` keeps one warm connection per reused function instance, avoiding
// pooler exhaustion when many instances spin up.
const client = postgres(
  connectionString ?? "postgres://unset:unset@127.0.0.1:5432/unset",
  {
    connect_timeout: 10,
    idle_timeout: 20,
    max: 1,
    prepare: false,
  }
);

export const db = drizzle({ client, schema });
