# @repo/db

Shared Drizzle ORM schema and DAO layer for neue.

## Commands

```bash
npm run db:pull --workspace=packages/db
npm run db:push:init --workspace=packages/db
npm run db:push --workspace=packages/db
npm run db:local:push:init --workspace=packages/db
npm run db:local:push --workspace=packages/db
```

## Seed data

```bash
psql "$DATABASE_URL" -f packages/db/seed.sql
```

## Local Supabase workflow

Supabase runs the database locally. Drizzle Kit pushes the schema directly from
[`src/schema.ts`](./src/schema.ts).

The safest local path is to use a dedicated database instead of the shared
`postgres` database. The local wrapper creates the database if needed and then
runs `drizzle-kit push` against it.

```bash
# from repo root
supabase start

# defaults to postgresql://postgres:postgres@127.0.0.1:54322/neue_docs
npm run db:local:push:init --workspace=packages/db
npm run db:local:url --workspace=packages/db

# optional: use a different dedicated database name
LOCAL_DATABASE_NAME=neue_docs_drizzle_test npm run db:local:push --workspace=packages/db

# use the URL printed by db:local:url
psql "$DATABASE_URL" -f packages/db/seed.sql
```
