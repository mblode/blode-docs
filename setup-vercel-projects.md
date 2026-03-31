# Vercel Project Setup

Use this when recreating the live Vercel setup from scratch.

## 1. Docs Frontend

1. Go to `https://vercel.com/new`.
2. Import `mblode/blodemd`.
3. Configure:
   - **Project Name**: `blodemd-docs`
   - **Root Directory**: `.`
   - **Framework Preset**: Next.js
   - **Build Command**: `npx turbo run build --filter=docs...`
   - **Output Directory**: `apps/docs/.next`
4. Add `blode.md` as a production domain.
5. After the domain is verified, add the wildcard entry `.blode.md`.
6. Recreate any non-website DNS records you still need in Vercel DNS before removing the old provider.

## 2. API

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

### `blodemd-docs`

- `DOCS_API_URL`
- `DATABASE_URL`
- `PLATFORM_ROOT_DOMAIN`
- Supabase variables required by the docs app

### `blodemd-api`

- `DATABASE_URL`
- `DOCS_APP_URL`
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

## Important Routing Note

The product docs are served through the tenant with slug `docs`.

- `https://blode.md/docs`
- `https://docs.blode.md`

Both routes require the production database to contain a `docs` project row.

## Wildcard Note

Platform subdomains are now served by the wildcard on Vercel DNS. The API no
longer provisions `{slug}.blode.md` hosts one by one.
