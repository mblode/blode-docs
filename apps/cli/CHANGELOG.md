# blodemd

## 0.0.12

### Patch Changes

- 85c7a6a: Fix `npx blodemd` failing with `Cannot find package '@repo/common'`. The CLI build now builds the workspace `@repo/*` packages before running tsdown so their compiled output is inlined into the published bundle, and the npm publish workflow runs the CLI build through turbo so `^build` ordering is respected.

## 0.0.11

### Patch Changes

- Split display name from deploy slug in project config and fix deploy workflow issues

## 0.0.10

### Patch Changes

- Fix SiteConfig format validation in docs.json previewing

## 0.0.9

### Patch Changes

- Refactor API with CORS support, header-based auth, and domains/tenants overhaul; add new CLI commands (new, scaffold, upload, logout, whoami); improve docs UI components and search

## 0.0.8

### Patch Changes

- Refactor edge-config handling, enhance CLI dev server and packaging, remove Cloudflare DNS integration

## 0.0.7

### Patch Changes

- Update docs components, icons, deployment configuration, and CLI dev server improvements including db:seed script and content directory scanning fixes

## 0.0.6

### Patch Changes

- Add product documentation at docs.blode.md, remove orbit example, rename atlas to example

## 0.0.5

### Patch Changes

- Support external content roots and improve multi-tenant doc rendering

## 0.0.4

### Patch Changes

- b04215c: Rename npm package from `blode-docs` to `blodemd`

## 0.0.3

### Patch Changes

- Migrate API to Hono and fix Vercel deployment configuration

## 0.0.2

### Patch Changes

- Fix monorepo build and deployment issues; move CLI from packages/docs-cli to apps/cli with ESM compatibility improvements.
