# Local Development Setup

## Node version

- `.nvmrc` pins `20.17.0`, but vitest 4 (via `std-env`) requires **Node 22+** to load `vitest.config.ts`. Tests fail with `ERR_REQUIRE_ESM` on Node 20. Use `nvm use 22` (any 22.x works) before running `npm run test:unit` or any vitest command.

## Package tests

- Unit tests live alongside source as `*.unit.test.ts` and run via `npm run test:unit -- <path>` from the repo root (runs `vitest run --project unit <path>`). Example: `npm run test:unit -- packages/contracts`.
- The `pretest:unit` hook always runs `npm run build:packages` first, so package test runs type-check their compiled outputs too.

## Drizzle

- `@repo/db` uses `drizzle-kit push` (not migrations). After editing `packages/db/src/schema.ts`, run `npm run db:push` (against a live DATABASE_URL) or `npm run db:local:push` (against the Supabase local stack) to apply. No SQL migration files are generated or committed.
