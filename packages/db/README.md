# @repo/db

Shared Drizzle ORM schema and DAO layer for Blode.md.

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

## Local Docker workflow

Docker runs a standard Postgres 16 instance locally (matching Neon's version in
production). Drizzle Kit pushes the schema directly from
[`src/schema.ts`](./src/schema.ts).

```bash
# from repo root

# start postgres
npm run db:up

# defaults to postgresql://postgres:postgres@127.0.0.1:5432/blode_docs
npm run db:push

# optional: seed data
psql "$DATABASE_URL" -f packages/db/seed.sql

# stop postgres
npm run db:down
```

For integration tests, set `DATABASE_URL` to a separate database:

```bash
LOCAL_DATABASE_NAME=blode_docs_drizzle_test npm run db:local:push --workspace=packages/db
```
