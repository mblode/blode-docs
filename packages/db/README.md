# @repo/db

Shared Drizzle ORM schema and DAO layer for Blode.md.

## Commands

```bash
npm run db:pull --workspace=packages/db
npm run db:push:init --workspace=packages/db
npm run db:push --workspace=packages/db
npm run db:sync-auth-users --workspace=packages/db
npm run db:local:push:init --workspace=packages/db
npm run db:local:push --workspace=packages/db
```

`db:push` and `db:local:push` now install an idempotent Supabase auth trigger that
keeps `public.users` in sync with `auth.users` when the `auth` schema exists.

## Seed data

For the current schema, use the TypeScript seed:

```bash
DATABASE_URL=... tsx packages/db/seed.ts
```

The repo also contains `packages/db/seed.sql`, but it targets older tables and
does not create rows in the current `public.users` table.

## Local Supabase workflow

Local development uses Supabase's local Postgres and auth stack. Drizzle Kit
pushes the application schema from [`src/schema.ts`](./src/schema.ts), then the
auth sync installer adds the `auth.users` -> `public.users` trigger.

```bash
# from repo root

# start Supabase locally
npm run db:start

# defaults to postgresql://postgres:postgres@127.0.0.1:54322/postgres
npm run db:push

# optional: create a seed user and sample projects
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres tsx packages/db/seed.ts

# stop Supabase
npm run db:stop
```

For integration tests, set `DATABASE_URL` to a separate database:

```bash
LOCAL_DATABASE_NAME=blode_docs_drizzle_test npm run db:local:push --workspace=packages/db
```
