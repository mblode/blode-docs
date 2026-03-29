# Blode.md Repository Guidelines

## Project Structure

- Turborepo monorepo; workspaces defined in root `package.json`.
- `apps/` — product apps: `apps/docs` (Next.js, port 3001), `apps/api` (Hono, port 4000), and `apps/cli` (CLI tool).
- `packages/` — shared libraries (`@repo/contracts`, `@repo/db`, `@repo/models`, `@repo/common`, `@repo/validation`, `@repo/ui`, `@repo/api-client`, `@repo/prebuild`, `@repo/previewing`) and config packages (`@repo/typescript-config`).
- Root config: `turbo.json`, `.oxlintrc.json`, `.oxfmtrc.jsonc`.

## Commands

```sh
npm run dev              # start all apps (docs → :3001, api → :4000)
npm run build            # build all packages/apps
npm run check-types      # TypeScript type check across workspaces
npm run lint             # Oxlint lint check
npm run lint:fix         # auto-fix lint issues
npm run format           # Oxfmt format
npm run fix              # Ultracite auto-fix (lint + format together)
npm run check            # Ultracite check without fixing

# Run a single app
npx turbo run dev --filter=docs
npx turbo run dev --filter=api
```

## Testing

```sh
npm run test              # full suite: unit → component → integration → smoke → e2e
npm run test:unit         # Vitest unit tests
npm run test:component    # Vitest component tests
npm run test:integration  # Vitest integration tests
npm run test:smoke        # Vitest smoke tests
npm run test:e2e          # Playwright end-to-end tests
```

## Environment Setup

Copy `.env.example` to `.env.local` before running the API. Required variables include `DATABASE_URL` (PostgreSQL) and `BLOB_READ_WRITE_TOKEN` (Vercel Blob). The docs app reads from the API at runtime.

## Gotchas

- **API build may fail** due to ESM/TypeScript module resolution issues with Drizzle and `@repo/contracts`. Run `npx turbo run build --filter=docs` to build only the docs app if the API is blocking deployment.
- **`@repo/supabase` is deprecated** — do not add new imports or dependencies on it.
- **Multi-tenant routing** uses Next.js 16's `proxy.ts` convention (`apps/docs/proxy.ts`), not `middleware.ts`. Never create a `middleware.ts` — it conflicts with `proxy.ts` and breaks the build. Platform routes (e.g. `/oauth`) must be added to `DEFAULT_RESERVED_PATHS` in `apps/docs/lib/tenancy.ts` to bypass tenant resolution. Changes to domain/tenant logic require updating both the proxy and the API tenant resolution in `apps/api/src/index.ts`.
- **Pre-commit hook** runs `ultracite fix` on staged files via Lefthook. If it fails, run `npm run fix` and re-stage.

## Conventions

- TypeScript-first; Node >=18. Use `const` by default, never `var`.
- Workspace packages use `@repo/*` scope and kebab-case folder names.
- Formatting and linting via Ultracite (Oxlint + Oxfmt) — run `npm run fix` before committing.
- Conventional commits preferred: `feat(scope): ...`, `fix(scope): ...` where scope matches the app/package name.
- No PR template — include a short summary, testing notes, and screenshots for UI changes.
