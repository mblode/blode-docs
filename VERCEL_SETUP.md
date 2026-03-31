# Vercel Deployment - Current Setup

This file reflects the live Vercel setup as of March 31, 2026.

## Active Projects

| Surface       | Vercel Project | Root Directory | Build Command                          | Output Directory  | Production URL         |
| ------------- | -------------- | -------------- | -------------------------------------- | ----------------- | ---------------------- |
| Docs frontend | `blodemd-docs` | `.`            | `npx turbo run build --filter=docs...` | `apps/docs/.next` | `https://blode.md`     |
| API           | `blodemd-api`  | `apps/api`     | `npx turbo run build --filter=api...`  | `dist`            | `https://api.blode.md` |

## Domain Notes

- `blode.md` and `www.blode.md` point at `blodemd-docs`.
- `*.blode.md` is covered by a wildcard DNS record and tenant routing in `apps/docs`.
- `api.blode.md` points at `blodemd-api`.
- Product docs are tenant content, not a special hardcoded route. Both `https://docs.blode.md` and `https://blode.md/docs` work only when the production API contains a tenant with slug `docs`.

## Re-Linking A Project

If you need to relink either project in Vercel:

### Docs frontend

1. Open `https://vercel.com/blode/blodemd-docs/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `.`.
4. Keep the project build settings in sync with [apps/docs/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/docs/vercel.json).

### API

1. Open `https://vercel.com/blode/blodemd-api/settings/git`.
2. Connect `mblode/blodemd`.
3. Set **Root Directory** to `apps/api`.
4. Keep the project build settings in sync with [apps/api/vercel.json](/Users/mblode/Code/mblode/blodemd/apps/api/vercel.json).

## Verification Checklist

- `vercel project ls` shows `blodemd-docs` and `blodemd-api`.
- `vercel alias ls` includes `blode.md`, `docs.blode.md`, and `api.blode.md`.
- `curl -I https://blode.md/docs` returns `200`.
- `curl -I https://docs.blode.md` returns `200`.
