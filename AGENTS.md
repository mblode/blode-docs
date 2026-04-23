# Blode.md Repository Guidelines

## Project Structure

- Turborepo monorepo; workspaces defined in root `package.json`.
- `apps/` — product apps:
  - `apps/web` (Next.js, marketing — `/`, `/about`, `/blog`, `/changelog`, `/privacy`, `/terms`, `/security`). Owns apex `blode.md`. Rewrites `/docs`, `/api`, `/sites`, `/.well-known`, `/llms*.txt` to `DOCS_APP_URL` and `/app`, `/oauth` to `DASHBOARD_APP_URL`.
  - `apps/docs` (Next.js, port 3001) — tenant-proxy (`proxy.ts`), multi-tenant docs rendering, public docs utilities, API routes. Served at `docs.blode.md` (or internally via rewrite).
  - `apps/dashboard` (Next.js, port 3002) — product dashboard (`/app`) and auth (`/oauth`). Served via internal rewrite from `apps/web` or from a dedicated dashboard deployment.
  - `apps/api` (Hono, port 4000).
  - `apps/cli` (CLI tool).
- `packages/` — shared libraries (`@repo/contracts`, `@repo/db`, `@repo/models`, `@repo/common`, `@repo/validation`, `@repo/ui`, `@repo/api-client`, `@repo/prebuild`, `@repo/previewing`) and config packages (`@repo/typescript-config`).
- Root config: `turbo.json`, `.oxlintrc.json`, `.oxfmtrc.jsonc`.

## Commands

```sh
npm run dev              # start all apps (web → portless blodemd.localhost, docs → :3001, dashboard → :3002, api → :4000)
npm run build            # build all packages/apps
npm run check-types      # TypeScript type check across workspaces
npm run lint             # Oxlint lint check
npm run lint:fix         # auto-fix lint issues
npm run format           # Oxfmt format
npm run fix              # Ultracite auto-fix (lint + format together)
npm run check            # Ultracite check without fixing

# Run a single app
npx turbo run dev --filter=web
npx turbo run dev --filter=docs
npx turbo run dev --filter=dashboard
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

- **API build may fail** due to ESM/TypeScript module resolution issues with Drizzle and `@repo/contracts`. Run `npx turbo run build --filter=docs --filter=dashboard` to build only the frontends that still depend on the docs/dashboard server code if the API is blocking deployment.
- **Dashboard production deploys run schema sync first.** `apps/dashboard/vercel.json` uses `apps/dashboard/scripts/vercel-build.sh`, which runs `npm run db:push:ci --workspace=packages/db` when `VERCEL_ENV=production` before building the app. Keep `DATABASE_URL` set on `blodemd-dashboard`, and do not remove the build wrapper unless schema sync moves somewhere else deliberately.
- **`@repo/supabase` is deprecated** — do not add new imports or dependencies on it.
- **Multi-tenant routing** uses Next.js 16's `proxy.ts` convention (`apps/docs/proxy.ts`), not `middleware.ts`. Never create a `middleware.ts` — it conflicts with `proxy.ts` and breaks the build. `DEFAULT_RESERVED_PATHS` in `apps/docs/lib/tenancy.ts` must keep `/app` and `/oauth` reserved so tenant resolution cannot consume dashboard/auth paths when apex traffic reaches the docs app. Changes to domain/tenant logic require updating both the docs proxy and the API tenant resolution in `apps/api/src/index.ts`.
- **apps/web ↔ apps/docs ↔ apps/dashboard split.** Marketing lives in `apps/web`; tenant docs live in `apps/docs`; auth/dashboard lives in `apps/dashboard`. `apps/web/next.config.js` rewrites `/docs/*`, `/api/*`, `/sites/*`, `/.well-known/*`, `/llms*.txt` to `DOCS_APP_URL` (default `http://127.0.0.1:3001`) and `/app/*`, `/oauth/*` to `DASHBOARD_APP_URL` (default `http://127.0.0.1:3002`, or `https://app.<PLATFORM_ROOT_DOMAIN>` on Vercel). `apps/docs/next.config.js` also proxies `/app/*`, `/oauth/*`, and matching `/_next/*` assets to `DASHBOARD_APP_URL` as a compatibility layer when apex traffic lands on docs or an upstream rewrite misroutes dashboard traffic. The original host rides along as `x-forwarded-host`; only `apps/docs/proxy.ts` reads it via `getRequestHost` in `apps/docs/lib/tenancy.ts`. In production set both `DOCS_APP_URL` and `DASHBOARD_APP_URL` to their deployment URLs; locally set `DOCS_APP_URL=https://docs.localhost` and `DASHBOARD_APP_URL=http://127.0.0.1:3002` in `apps/web/.env.local` and run `npm run dev --workspace=docs` plus `npm run dev --workspace=dashboard` alongside.
- **Marketing-page components are intentionally duplicated** in `apps/web/components/ui/` (button, card, badge, sheet, tabs, morph-icon, theme-toggle, hero-media, text-effect, animated-group, marketing-header, marketing-shell, site-footer). Do not add Supabase or `@repo/*` deps to `apps/web` — it stays auth-free and light.
- **Pre-commit hook** runs `ultracite fix` on staged files via Lefthook. If it fails, run `npm run fix` and re-stage.

## Conventions

- TypeScript-first; Node 24.x. Use `const` by default, never `var`.
- Workspace packages use `@repo/*` scope and kebab-case folder names.
- Formatting and linting via Ultracite (Oxlint + Oxfmt) — run `npm run fix` before committing.
- Conventional commits preferred: `feat(scope): ...`, `fix(scope): ...` where scope matches the app/package name.
- No PR template — include a short summary, testing notes, and screenshots for UI changes.

## Available Context

Additional context is available in the files below. Consult the relevant file when working in a related area — see each description for scope.

- `.claude/knowledge/incident-troubleshooting.md` — Incident debugging and recovery. Known failure modes, debugging approaches, runbooks, recovery steps.
- `.claude/knowledge/local-dev-setup.md` — Local Development Setup. Node 24 runtime, test commands, Drizzle push workflow.
- `.claude/knowledge/architecture-boundaries.md` — Architecture & System Boundaries. Dual Tenant type, tenant header flow, edge-config sync site, analytics scope.
