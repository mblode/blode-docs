# Vercel Project Setup

Use this when recreating the split frontend topology from scratch.

## 1. Web Frontend

1. Go to `https://vercel.com/new`.
2. Import `mblode/blodemd`.
3. Configure:
   - **Project Name**: `blodemd-web`
   - **Root Directory**: `.`
   - **Framework Preset**: Next.js
   - **Build Command**: `npx turbo run build --filter=web...`
   - **Output Directory**: `apps/web/.next`
4. Add `blode.md` and `www.blode.md` as production domains.
5. Set `DOCS_APP_URL` to the docs deployment URL and `DASHBOARD_APP_URL` to the dashboard deployment URL.
6. Keep the project build settings in sync with [apps/web/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/web/vercel.json).

## 2. Docs Frontend

1. Go to `https://vercel.com/new`.
2. Import `mblode/blodemd`.
3. Configure:
   - **Project Name**: `blodemd-docs`
   - **Root Directory**: `.`
   - **Framework Preset**: Next.js
   - **Build Command**: `npx turbo run build --filter=docs...`
   - **Output Directory**: `apps/docs/.next`
4. Add `docs.blode.md` as a production domain.
5. After the domain is verified, add the wildcard entry `.blode.md`.
6. Keep the project build settings in sync with [apps/docs/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/docs/vercel.json).

## 3. Dashboard Frontend

1. Go to `https://vercel.com/new`.
2. Import `mblode/blodemd`.
3. Configure:
   - **Project Name**: `blodemd-dashboard`
   - **Root Directory**: `apps/dashboard`
   - **Framework Preset**: Next.js
   - **Build Command**: `bash ./scripts/vercel-build.sh`
   - **Output Directory**: `.next`
4. Add `app.blode.md` as a production domain.
5. Keep the project build settings in sync with [apps/dashboard/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/dashboard/vercel.json).

## 4. API

1. Go to `https://vercel.com/new`.
2. Import `mblode/blodemd`.
3. Configure:
   - **Project Name**: `blodemd-api`
   - **Root Directory**: `apps/api`
   - **Framework Preset**: Hono
   - **Build Command**: `npx turbo run build --filter=api...`
   - **Output Directory**: `dist`
4. Add the `api.blode.md` alias.

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

- `NEXT_PUBLIC_API_URL`
- `DATABASE_URL`
- `PLATFORM_ROOT_DOMAIN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- optional `PLATFORM_ASSET_PREFIX`

Production dashboard builds run `npm run db:push:ci --workspace=packages/db`
before the app build, so `DATABASE_URL` must be present in the Vercel project.

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
- optional `VERCEL_EDGE_CONFIG_ID` if you want Edge Config sync
- optional `CORS_ALLOWED_ORIGINS` for extra browser origins beyond the defaults

## Important Routing Notes

- `https://blode.md/docs` is a web rewrite to the docs frontend.
- `https://blode.md/app` and `https://blode.md/oauth/*` are web rewrites to the dashboard frontend.
- `https://docs.blode.md` and `https://<tenant>.blode.md` go straight to the docs frontend.
- `https://app.blode.md` is the canonical direct dashboard deployment URL; `apps/web` should point `DASHBOARD_APP_URL` there.

The product docs are still served through the tenant with slug `docs`.

- `https://blode.md/docs`
- `https://docs.blode.md`

Both routes require the production database to contain a `docs` project row.

## Wildcard Note

Platform subdomains for tenant docs are served by the wildcard on Vercel DNS.
The API no longer provisions `{slug}.blode.md` hosts one by one.
