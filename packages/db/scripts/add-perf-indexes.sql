-- Run this once against production Supabase to add dashboard-perf indexes
-- without taking table locks. Use `CREATE INDEX CONCURRENTLY` (safe on live
-- traffic; cannot run inside a transaction).
--
-- After this, the schema.ts declarations match prod. `drizzle-kit push` will
-- be a no-op for these tables.

CREATE INDEX CONCURRENTLY IF NOT EXISTS projects_user_id_idx
  ON projects (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS domains_project_id_idx
  ON domains (project_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS deployments_project_id_created_at_idx
  ON deployments (project_id, created_at DESC);
