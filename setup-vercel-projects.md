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
4. Add production aliases for `blode.md`, `www.blode.md`, and the tenant subdomains you want to expose.

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
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOB_READ_WRITE_TOKEN`
- `PLATFORM_ROOT_DOMAIN`
- `VERCEL_CNAME_TARGET`
- optional Cloudflare credentials if you want the API to manage DNS automatically

## Important Routing Note

The product docs are served through the tenant with slug `docs`.

- `https://blode.md/docs`
- `https://docs.blode.md`

Both routes require the production database to contain a `docs` project row.
