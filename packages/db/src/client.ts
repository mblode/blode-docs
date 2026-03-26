import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const createDatabase = () => {
  const pool = new Pool({
    allowExitOnIdle: true,
    connectionString: process.env.DATABASE_URL,
  });

  return {
    db: drizzle({ client: pool, schema }),
    pool,
  };
};

const globalForDatabase = globalThis as {
  database?: ReturnType<typeof createDatabase>;
};

const database = globalForDatabase.database ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.database = database;
}

export const { db, pool } = database;
