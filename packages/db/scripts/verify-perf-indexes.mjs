import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  const rows =
    await sql`SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('projects','deployments','domains') AND schemaname='public' ORDER BY tablename, indexname`;
  for (const r of rows) {
    console.log(r.tablename, r.indexname);
  }
} finally {
  await sql.end({ timeout: 5 });
}
