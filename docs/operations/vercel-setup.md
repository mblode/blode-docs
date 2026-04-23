# Vercel Deployment - Target Setup

This file reflects the repo target after the dashboard split as of April 23, 2026. Verify aliases before treating it as live.

## Active Projects

| Surface            | Vercel Project      | Root Directory   | Build Command                          | Output Directory  | Production URL          |
| ------------------ | ------------------- | ---------------- | -------------------------------------- | ----------------- | ----------------------- |
| Web frontend       | `blodemd-web`       | `.`              | `npx turbo run build --filter=web...`  | `apps/web/.next`  | `https://blode.md`      |
| Docs frontend      | `blodemd-docs`      | `.`              | `npx turbo run build --filter=docs...` | `apps/docs/.next` | `https://docs.blode.md` |
| Dashboard frontend | `blodemd-dashboard` | `apps/dashboard` | `bash ./scripts/vercel-build.sh`       | `.next`           | `https://app.blode.md`  |
| API                | `blodemd-api`       | `apps/api`       | `npx turbo run build --filter=api...`  | `dist`            | `https://api.blode.md`  |

## Domain Notes

- `blode.md` and `www.blode.md` point at `blodemd-web`.
- `blode.md/docs` is a host-preserving rewrite from `blodemd-web` to `blodemd-docs`.
- `blode.md/app` and `blode.md/oauth/*` are host-preserving rewrites from `blodemd-web` to `blodemd-dashboard`.
- `docs.blode.md` and `*.blode.md` point at `blodemd-docs`.
- `app.blode.md` points at `blodemd-dashboard`.
- `api.blode.md` points at `blodemd-api`.
- Product docs are tenant content, not a special hardcoded route. Both `https://docs.blode.md` and `https://blode.md/docs` work only when the production API contains a tenant with slug `docs`.

## Re-Linking A Project

If you need to relink any project in Vercel:

### Web frontend

1. Open `https://vercel.com/blode/blodemd-web/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `.`.
4. Keep the project build settings in sync with [apps/web/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/web/vercel.json).

### Docs frontend

1. Open `https://vercel.com/blode/blodemd-docs/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `.`.
4. Keep the project build settings in sync with [apps/docs/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/docs/vercel.json).

### Dashboard frontend

1. Open `https://vercel.com/blode/blodemd-dashboard/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `.`.
4. Keep the project build settings in sync with [apps/dashboard/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/dashboard/vercel.json).

### API

1. Open `https://vercel.com/blode/blodemd-api/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `apps/api`.
4. Keep the project build settings in sync with [apps/api/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/api/vercel.json).

## Required Environment Variables

### `blodemd-web`

- `DOCS_APP_URL`
- `DASHBOARD_APP_URL`

### `blodemd-docs`

- `NEXT_PUBLIC_API_URL`
- `PLATFORM_ROOT_DOMAIN`
- `REVALIDATE_SECRET`
- optional `EDGE_CONFIG`
- optional `PLATFORM_ASSET_PREFIX`

### `blodemd-dashboard`

- `DATABASE_URL`
- `NEXT_PUBLIC_API_URL`
- `PLATFORM_ROOT_DOMAIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`

`blodemd-dashboard` runs `npm run db:push:ci --workspace=packages/db` as part of
production builds before Next.js compiles. That keeps the production schema in
sync with the deployed dashboard code and prevents schema drift from breaking
`/app`.

### `blodemd-api`

- `DATABASE_URL`
- `DOCS_APP_URL`
- optional `DOCS_REVALIDATE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `PLATFORM_ROOT_DOMAIN`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- optional `VERCEL_TEAM_ID`
- optional `VERCEL_TEAM_SLUG`
- optional `VERCEL_EDGE_CONFIG_ID`

## Verification Checklist

- `vercel project ls` shows `blodemd-web`, `blodemd-docs`, `blodemd-dashboard`, and `blodemd-api`.
- `vercel alias ls` includes `blode.md`, `docs.blode.md`, `app.blode.md`, and `api.blode.md`.
- `curl -I https://blode.md/docs` returns `200`.
- `curl -I https://docs.blode.md` returns `200`.
- `curl -I https://blode.md/app` returns `307` to `/oauth/consent` when unauthenticated.
- `curl -I https://app.blode.md/app` returns `307` to `/oauth/consent` when unauthenticated.
