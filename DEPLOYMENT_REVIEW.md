# Vercel Deployment Review

This file reflects the live deployment topology as of March 31, 2026.

## Current State

- The repo is deployed through two Vercel projects:
  - `blodemd-docs` at `https://blode.md`
  - `blodemd-api` at `https://api.blode.md`
- The docs frontend is a multi-tenant Next.js app. It serves:
  - the marketing site on the root host
  - tenant docs on `/<slug>` at the root host
  - tenant docs on `<slug>.blode.md`
- The product docs are tenant content for the slug `docs`, not a dedicated platform route.

## Production Routing Facts

- `https://blode.md/docs` resolves only if the production API can resolve a tenant with slug `docs`.
- `https://docs.blode.md` resolves only if:
  - the `docs` tenant exists in production data
  - `docs.blode.md` is aliased to `blodemd-docs`
  - wildcard or explicit DNS for `*.blode.md` reaches Vercel
- The root DNS zone currently includes:
  - an apex `ALIAS` for `blode.md`
  - a wildcard `ALIAS` for `*.blode.md`

## March 31, 2026 Incident

The production issue was not a missing docs page in the app. It was a missing tenant in production data.

- Before the fix:
  - `https://docs.blode.md` failed externally
  - `https://blode.md/docs` returned a tenant-resolution `404`
  - `GET https://api.blode.md/tenants/docs` returned `404`
- After the fix:
  - the `docs` project exists in production
  - `GET https://api.blode.md/tenants/docs` returns `200`
  - `https://blode.md/docs` returns `200`
  - `https://docs.blode.md` returns `200`

## Drift To Watch

- Older notes in this repo referenced Vercel projects named `web`, `dashboard`, `docs`, and `api`. Those are stale and do not match the current Vercel project names.
- Production data still contains legacy tenants like `orbit` and `atlas`.
- Seed data expects `docs`, `blode`, and `example`; if production is recreated from scratch, verify the seed and production inventory match.

## Verification Commands

```sh
vercel project ls
vercel alias ls --limit 50
vercel dns list blode.md
curl -I https://blode.md/docs
curl -I https://docs.blode.md
curl https://api.blode.md/tenants | jq -r '.[].slug'
```
