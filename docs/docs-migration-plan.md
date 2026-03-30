# Blodemd Docs Migration Plan

This plan migrates the requested docs sets into `blodemd` using the working `allmd` setup as the baseline content model.

## Goal

Move each docs set into `apps/docs/content/<slug>` with:

- a root `docs.json`
- MDX pages in the content tree
- optional nested `meta.json` kept only as authoring references
- no dependency on the source repo's docs runtime

## Research Workstreams

### Team Baseline: `allmd`

- Baseline source: `/Users/mblode/Code/mblode/allmd/apps/docs`
- Shape: pure content tree with `docs.json`, 18 MDX files, and 3 `meta.json` files
- Important invariant: `allmd` is content-only. There is no runtime code inside its docs folder.
- Reference files:
  - `/Users/mblode/Code/mblode/allmd/apps/docs/docs.json`
  - `/Users/mblode/Code/mblode/allmd/apps/docs/meta.json`
  - `/Users/mblode/Code/mblode/allmd/apps/docs/cli/meta.json`

### Team Target: `blodemd`

- Target slug resolution already points at `apps/docs/content/<slug>` via `apps/docs/lib/content-root.ts`.
- Runtime requires `docs.json`. `meta.json` is not consumed at runtime.
- `blodemd` already supports these MDX components:
  - `Callout`, `Note`, `Warning`, `Info`, `Tip`, `Check`, `Danger`
  - `Card`
  - `Tabs` and `Tab` with either `title` or `label`
  - `ResponseField`
- `blodemd` does not currently add Fumadocs runtime behavior, Fumadocs `Cards`, or Mermaid rendering.
- Reference files:
  - `/Users/mblode/Code/mblode/blodemd/apps/docs/lib/content-root.ts`
  - `/Users/mblode/Code/mblode/blodemd/packages/previewing/src/index.ts`
  - `/Users/mblode/Code/mblode/blodemd/apps/docs/components/mdx/index.tsx`
  - `/Users/mblode/Code/mblode/blodemd/apps/docs/components/mdx/tabs.tsx`

## Source Audit Summary

| Source                | Actual Source Path                                                     | Content Shape               | Volume                           | Main Migration Issues                                                                                         | Risk   |
| --------------------- | ---------------------------------------------------------------------- | --------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| allmd                 | `/Users/mblode/Code/mblode/allmd/apps/docs`                            | Mintlify-style content-only | 18 MDX, 3 meta                   | Baseline only                                                                                                 | Low    |
| donebear product docs | `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs` | Fumadocs content tree       | 13 MDX, 3 meta                   | Source path correction, new `docs.json`, root-relative screenshots                                            | Low    |
| donebear package docs | `/Users/mblode/Code/donebear/donebear/docs/packages`                   | Fumadocs content tree       | 41 MDX, 13 meta                  | Source path correction, new `docs.json`, many `/docs/...` links, Mermaid blocks, separate scope decision      | High   |
| stratasync            | `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs`        | Fumadocs content tree       | 39 MDX, 9 meta                   | New `docs.json`, many `/docs/...` links, Mermaid blocks, `<UseCases />` landing component                     | High   |
| dnd-grid              | `/Users/mblode/Code/mblode/dnd-grid/apps/docs`                         | Mintlify-style content-only | 35 MDX, 1 docs.json, 18 snippets | Asset path rewrites, root-relative internal links, decide whether snippets should be copied                   | Medium |
| shareful              | `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs`    | Fumadocs content tree       | 9 MDX, 1 meta                    | Source path correction, new `docs.json`, `/docs/...` links, unsupported `Cards`, unsupported callout variants | Medium |

## Migration Invariants

- [ ] Keep one slug per docs set under `apps/docs/content/<slug>`.
- [ ] Treat `docs.json` as the only runtime source of navigation truth in `blodemd`.
- [ ] Keep nested `meta.json` only as migration scaffolding or authoring hints.
- [ ] Rewrite source-repo-specific route assumptions like `/docs/...` to tenant-safe links.
- [ ] Copy or rewrite root-relative assets such as `/logo.svg` or `/done-bear-1.png`.
- [ ] Do not depend on Fumadocs runtime behavior after migration.
- [ ] Only add runtime features to `blodemd` if at least two incoming docs sets need them.

## Phase 0: Scope Freeze And Path Corrections

- [ ] Confirm the corrected source paths:
  - `donebear`: use `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs`
  - `shareful`: use `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs`
- [ ] Decide whether `donebear/docs/packages` is in scope for this migration or is a separate follow-up.
- [ ] Decide whether `dnd-grid/snippets` should be copied into `blodemd` for archival completeness or omitted because the current MDX pages do not import them.
- [ ] Decide whether branding is required for each imported docs set or whether a neutral `blodemd` theme is acceptable for phase 1.

## Phase 1: Establish The `allmd` Contract In `blodemd`

- [ ] Use `apps/docs/content/allmd` as the canonical example for incoming content sets.
- [ ] Standardize each incoming slug on this layout:
  - `apps/docs/content/<slug>/docs.json`
  - `apps/docs/content/<slug>/**/*.mdx`
  - optional `apps/docs/content/<slug>/**/meta.json`
- [ ] Document the navigation conversion rule:
  - convert Fumadocs `meta.json` ordering into Mintlify `docs.json.navigation.groups`
- [ ] Document the asset rule:
  - `docs.json` logo and favicon paths must exist in `apps/docs/public/...` or be rewritten to stable URLs
- [ ] Document the markdown link rule:
  - avoid hardcoded `/docs/...` unless the final deployment guarantees that prefix

## Phase 1.5: Build Migration Tooling Once

- [ ] Add a one-way helper to convert Fumadocs `meta.json` trees into Mintlify-style `docs.json.navigation.groups`
- [ ] Add a preflight check that flags unsupported MDX component tags such as `Cards`, `UseCases`, and unknown callout variants
- [ ] Add a preflight check that flags hardcoded `/docs/...` links
- [ ] Add a preflight check that flags root-relative asset references such as `/logo.svg` and `/favicon.svg`
- [ ] Add a preflight check that flags unsupported Mintlify config keys such as `integrations.ga4`
- [ ] Add a smoke step that loads each imported slug through the `blodemd` content index before the docs app build

## Phase 2: Low-Risk Migration First

### Shareful

- [ ] Create `apps/docs/content/shareful`.
- [ ] Author `apps/docs/content/shareful/docs.json` from `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/meta.json`.
- [ ] Copy the 9 MDX files from `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs`.
- [ ] Rewrite hardcoded `/docs/...` links in:
  - `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/creating-shares.mdx`
  - `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/what-is-a-share.mdx`
  - `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/faq.mdx`
  - `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/share-format.mdx`
  - `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/index.mdx`
- [ ] Replace `<Cards>` in `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/index.mdx` with a layout `blodemd` supports.
- [ ] Convert unsupported callout variants:
  - `type="warn"` -> `type="warning"`
  - `type="error"` -> `type="danger"`
  - source files: `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/share-format.mdx` and `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/content/docs/examples.mdx`
- [ ] Decide whether to bring over branding assets from `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/public/logo.svg` and `/Users/mblode/Code/shareful-ai/shareful-ai/apps/docs/public/fonts`.

### DoneBear Product Docs

- [ ] Create `apps/docs/content/donebear`.
- [ ] Use `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs` as the actual migration source.
- [ ] Author `docs.json` manually because this source has nested `meta.json` files but no root `docs.json`.
- [ ] Copy the 13 MDX files from:
  - `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/api`
  - `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/cli`
  - `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/mcp`
  - plus `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/index.mdx`
  - plus `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/raycast.mdx`
  - plus `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/skills.mdx`
- [ ] Copy Raycast screenshots referenced from `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/raycast.mdx`.
- [ ] Rewrite screenshot paths from `/done-bear-*.png` to the final asset location.
- [ ] Keep the existing relative links in `/Users/mblode/Code/donebear/donebear/apps/docs-frontend/content/docs/index.mdx` where possible.

## Phase 3: Direct Mintlify Migration

### dnd-grid

- [ ] Create `apps/docs/content/dnd-grid`.
- [ ] Copy `docs.json` and all MDX files from `/Users/mblode/Code/mblode/dnd-grid/apps/docs`.
- [ ] Keep supported MDX syntax as-is:
  - `Tabs` and `Tab`
  - `Note`
  - `Warning`
  - `ResponseField`
- [ ] Rewrite root-relative internal links like `/api-reference/layout-item` to tenant-safe links.
- [ ] Copy or rewrite docs.json asset paths:
  - `/Users/mblode/Code/mblode/dnd-grid/apps/docs/favicon.svg`
  - `/Users/mblode/Code/mblode/dnd-grid/apps/docs/logo/light.svg`
  - `/Users/mblode/Code/mblode/dnd-grid/apps/docs/logo/dark.svg`
- [ ] Decide whether to copy `/Users/mblode/Code/mblode/dnd-grid/apps/docs/snippets` even though the current MDX pages inline their example code.
- [ ] Decide whether external iframe previews like `https://dnd-grid.com/examples/basic-example?embed=1` stay external in phase 1.

## Phase 4: Fumadocs Conversion With Runtime Feature Gaps

### StrataSync

- [ ] Create `apps/docs/content/stratasync`.
- [ ] Convert the Fumadocs `meta.json` hierarchy under `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs` into a single Mintlify `docs.json`.
- [ ] Copy the 39 MDX files and keep the directory structure under the new slug.
- [ ] Rewrite hardcoded `/docs/...` links across the content tree.
- [ ] Replace `<UseCases />` in `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/index.mdx`.
- [ ] Choose a Mermaid strategy before migrating the architecture-heavy pages:
  - add Mermaid support to `blodemd`, or
  - convert Mermaid diagrams to static images, or
  - leave them as fenced code temporarily
- [ ] Mermaid-heavy files include:
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/architecture/index.mdx`
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/architecture/data-flow.mdx`
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/guides/collaborative-editing.mdx`
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/guides/load-strategies.mdx`
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/guides/offline-first.mdx`
  - `/Users/mblode/Code/donebear/stratasync/apps/docs/content/docs/guides/ssr-bootstrap.mdx`

## Phase 5: Optional Or Separate-Scope Migration

### DoneBear Package Docs

- [ ] Decide whether `/Users/mblode/Code/donebear/donebear/docs/packages` belongs under `donebear`, its own slug, or should stay out of this migration.
- [ ] If included, create a separate docs slug instead of silently merging it into the product docs.
- [ ] Convert `/Users/mblode/Code/donebear/donebear/docs/packages/meta.json` and nested package `meta.json` files into a new `docs.json`.
- [ ] Rewrite `/docs/...` links across the package docs.
- [ ] Handle Mermaid blocks in:
  - `/Users/mblode/Code/donebear/donebear/docs/packages/architecture/*`
  - `/Users/mblode/Code/donebear/donebear/docs/packages/guides/*`
- [ ] Validate naming drift because these docs reference `@done/*` packages, while `stratasync` references `@stratasync/*`.

## Phase 6: QA, Search, And Rollout

- [ ] Verify every incoming slug resolves through `apps/docs/lib/content-root.ts`.
- [ ] Build and browse each migrated docs set locally.
- [ ] Check navigation ordering against the source `meta.json` or `docs.json`.
- [ ] Check internal links on both slug-domain and custom-domain/path-prefix routes.
- [ ] Check images, logos, favicon, and font loading.
- [ ] Check unsupported MDX tags fail closed before rollout.
- [ ] Run `npm run build --filter=docs` or the repo-equivalent docs build check.

## Recommended Order

1. Shareful
2. DoneBear product docs
3. dnd-grid
4. StrataSync
5. DoneBear package docs, only if explicitly included in scope

## Exit Criteria

- [ ] Every migrated docs set has a working `docs.json`.
- [ ] No page depends on Fumadocs-only components or plugins.
- [ ] No page depends on broken `/docs/...` or root-relative asset paths.
- [ ] Navigation, assets, and search work in `blodemd`.
