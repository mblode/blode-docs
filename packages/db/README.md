# @repo/db

Shared Drizzle ORM schema, migrations, and DAO layer for Blode.md.

## Workflow

This package follows the standard **Drizzle Kit migrations** workflow:
schema lives in [`src/schema.ts`](./src/schema.ts); SQL migration files
live in [`drizzle/`](./drizzle) and are committed to git; production
applies them with `drizzle-orm`'s migrator.

```bash
# 1. Edit src/schema.ts, then generate the next migration:
npm run db:generate -w @repo/db
#    -> writes drizzle/<timestamp>_<auto-name>/migration.sql

# 2. (optional) Sanity-check the generated SQL:
npm run db:check -w @repo/db

# 3. Apply pending migrations to a database. Reads connection from
#    DIRECT_URL > POSTGRES_URL_NON_POOLING > DATABASE_URL.
DIRECT_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres \
  npm run db:migrate -w @repo/db
```

`db:migrate` is idempotent (drizzle-orm tracks applied migrations in
`drizzle.__drizzle_migrations`) and self-baselines: if `public.users`
already exists but the journal is empty, every current migration is
recorded as already-applied so an existing prod DB doesn't get
re-`CREATE TABLE`d.

It then re-installs the Supabase `auth.users -> public.users` trigger
via [`scripts/apply-auth-user-sync.mjs`](./scripts/apply-auth-user-sync.mjs),
which uses `create or replace` and is safe to re-run on every deploy.

### Connection URL: prefer the direct connection

drizzle-orm uses prepared statements internally; routing through
Supabase's pgbouncer in transaction mode (`:6543`) silently breaks
them and can hang `db:generate` introspection for minutes. Use the
direct connection (`db.<ref>.supabase.co:5432`) when possible, or
Supavisor's session-mode pool (`<region>.pooler.supabase.com:5432`)
when the direct host is IPv6-only and the consumer is IPv4-only
(e.g. Vercel build containers).

### Direct push (prototyping only)

`npm run db:push -w @repo/db` is kept for local iteration but is
**not** the production path. Anything `db:push` writes to the DB will
not be tracked in the migration journal — always follow up with
`db:generate` to capture the diff in a committed migration file.

## Local Supabase workflow

```bash
# from repo root
npm run db:start                         # boot Supabase locally
npm run db:local:migrate -w @repo/db     # apply migrations to localhost:54322
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  tsx packages/db/seed.ts                # seed sample data
npm run db:stop                          # tear it down
```

For integration tests, set `LOCAL_DATABASE_URL` to a separate database:

```bash
LOCAL_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/blode_docs_drizzle_test \
  npm run db:local:migrate -w @repo/db
```

## Production deploys

- `apps/dashboard` runs `npm run db:migrate -w @repo/db` from
  [`scripts/vercel-build.sh`](../../apps/dashboard/scripts/vercel-build.sh)
  before the Next.js build. Set `SKIP_DB_MIGRATE=1` in Vercel env to
  bypass entirely.
- `.github/workflows/db-migrate.yml` runs the same script on manual
  workflow dispatch — useful when you need to apply a migration
  without redeploying the app.

## Seed data

```bash
DATABASE_URL=... tsx packages/db/seed.ts
```

`packages/db/seed.sql` targets older tables and is left for reference
only.
