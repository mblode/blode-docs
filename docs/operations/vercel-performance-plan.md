# Vercel Docs Performance Plan

## Goal

Make the public docs surface behave like a Vercel-native static product:

- HTML, CSS, JS, and tenant utility routes served from the CDN
- host lookup handled by Edge Config instead of the docs API
- published content artifacts loaded from Blob
- Supabase used only for authoring, publish orchestration, and admin/control-plane reads

## Hard Decisions

- [x] Treat public docs as shared content, not per-request dynamic content.
- [x] Prefer CDN/ISR/static delivery over more runtime caching.
- [x] Keep Supabase off the anonymous public request path.
- [x] Use Edge Config for hot host-to-tenant lookup data.
- [x] Treat `cacheComponents` and `use cache` as a residual optimization layer, not the primary architecture.
- [x] Optimize for Vercel first instead of preserving backward compatibility with the old dynamic request model.

## Swarm Findings

### Team A: Next.js and Vercel Cache Model

- [x] `cacheComponents` is the new explicit cache model, but cached scopes cannot directly read `headers()` or `cookies()`.
- [x] Public pages shared across users should be cached or prerendered, not rendered fresh per request.
- [x] Vercel recommends CDN/ISR for public content and CDN headers only where manual control is needed.
- [x] Runtime Cache is regional and ephemeral; it is not the primary answer for public docs HTML.

### Team B: Vercel Regions and Supabase

- [x] Static output is already served near users from Vercel’s CDN.
- [x] Remaining compute should run near the data source, not near every user.
- [x] If any Vercel Function still touches Postgres, it should use a pooled serverless connection.
- [x] Supabase Auth should not sit on anonymous public page requests.
- [x] Asymmetric JWT signing plus `getClaims()` is the fast path for any remaining auth-sensitive checks.

### Team C: Mintlify Reference Shape

- [x] Mintlify’s hosted path behaves like a prerendered docs frontend.
- [x] Mintlify’s headless guidance pushes content processing to build time with Astro.
- [x] The useful lesson is architectural, not framework-specific: precompute nav, metadata, and MDX work ahead of the request.

## Current State In This Repo

### Already Completed

- [x] Staticize tenant docs page routes in [`apps/docs/app/sites/[tenant]/[[...slug]]/page.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/app/sites/[tenant]/[[...slug]]/page.tsx)
- [x] Staticize tenant utility and search routes under [`apps/docs/app/sites/[tenant]](/Users/mblode/Code/mblode/blodemd/apps/docs/app/sites/[tenant])
- [x] Remove `headers()` from the tenant page render path in [`apps/docs/lib/docs-runtime.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/docs-runtime.tsx)
- [x] Reuse shell raw MDX instead of double-reading content in [`apps/docs/lib/docs-runtime.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/docs-runtime.tsx)
- [x] Cut low-value RSC prefetches in sidebar, tiles, cards, and mobile nav
- [x] Move desktop sidebar and TOC to server-rendered markup
- [x] Add CDN cache headers on tenant rewrite responses in [`apps/docs/proxy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/proxy.ts)
- [x] Add explicit revalidation to tenant and blob-backed fetches

### Remaining Bottlenecks

- [ ] Hot host resolution still starts in [`apps/docs/lib/tenancy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/tenancy.ts) via `DOCS_API_URL/tenants/resolve`
- [ ] Root host-routed utility routes still depend on request-time tenant resolution through [`apps/docs/lib/request-tenant.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/request-tenant.ts)
- [ ] Runtime artifact assembly in [`apps/docs/lib/docs-runtime.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/docs-runtime.tsx) still builds nav, search items, TOC, and OpenAPI structures on demand
- [ ] Global theme and command-search UI still keep client JavaScript in the shell

## Workstreams

- [ ] Render/Cache team: static delivery, CDN headers, ISR validation
- [ ] Edge Lookup team: Edge Config schema, sync, and proxy integration
- [ ] Publish Pipeline team: prebuilt artifacts in Blob
- [ ] Frontend JS team: theme/search/mobile shell budget
- [ ] Perf QA team: live verification, waterfall, and cache-header checks

## Phase 1: Deploy And Validate The New Static Path

Why:
Until the new deployment is live, production numbers still reflect the old dynamic path.

- [ ] Deploy the current docs app to Vercel
- [ ] Verify the live `allmd.blode.md` page now maps to the new tenant static route output
- [ ] Capture live headers before and after deploy for:
  - [ ] `x-vercel-cache`
  - [ ] `x-matched-path`
  - [ ] `cache-control`
  - [ ] `cdn-cache-control`
  - [ ] `vercel-cdn-cache-control`
- [ ] Re-run live waterfall checks for:
  - [ ] `https://allmd.blode.md/docs/cli/converters/gdoc`
  - [ ] one tenant `search` route
  - [ ] one tenant `robots.txt` route
  - [ ] one tenant `sitemap.xml` route
- [ ] Record cold and warm TTFB from at least two regions
- [ ] Confirm custom-domain utility paths rewrite into static tenant routes through [`apps/docs/proxy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/proxy.ts)

## Phase 2: Move Tenant Resolution To Edge Config

Why:
The remaining hottest miss is host lookup. Vercel’s docs position Edge Config as the low-latency read path for frequently read, infrequently updated metadata.

### Deliverables

- [ ] Add a dedicated tenant-edge record schema for request-time lookup
- [ ] Sync host lookup records into Edge Config during publish/domain updates
- [ ] Make the proxy read Edge Config first and keep the docs API as fallback only
- [ ] Remove `DOCS_API_URL/tenants/resolve` from the public hot path

### File Targets

- [ ] Add `apps/docs/lib/edge-config.ts`
- [ ] Update [`apps/docs/lib/tenancy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/tenancy.ts) to:
  - [ ] normalize host once
  - [ ] read Edge Config first
  - [ ] keep the docs API resolver as a fallback/backfill path
  - [ ] preserve the short in-process promise cache only as a local collapse layer
- [ ] Update [`apps/docs/proxy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/proxy.ts) to rely on the new Edge Config-backed resolver
- [ ] Update [`apps/docs/lib/request-tenant.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/request-tenant.ts) so root utility routes use the same lookup path
- [ ] Add/update schemas in:
  - [ ] [`packages/contracts/src/tenant.ts](/Users/mblode/Code/mblode/blodemd/packages/contracts/src/tenant.ts)
  - [ ] [`packages/models/src/tenant.ts](/Users/mblode/Code/mblode/blodemd/packages/models/src/tenant.ts)

### Data Shape

- [ ] `host`
- [ ] `tenantSlug`
- [ ] `tenantId`
- [ ] `strategy`
- [ ] `basePath`
- [ ] `pathPrefix`
- [ ] `primaryDomain`
- [ ] `activeDeploymentId`
- [ ] `activeDeploymentManifestUrl`
- [ ] redirect target fields only if still needed at the edge

### API / Publish Hooks

- [ ] Update domain-management or publish code to write Edge Config records after successful changes
- [ ] Candidate integration points:
  - [ ] [`apps/api/src/routes/domains.ts](/Users/mblode/Code/mblode/blodemd/apps/api/src/routes/domains.ts)
  - [ ] [`apps/api/src/routes/deployments.ts](/Users/mblode/Code/mblode/blodemd/apps/api/src/routes/deployments.ts)
  - [ ] [`apps/api/src/lib/publish.ts](/Users/mblode/Code/mblode/blodemd/apps/api/src/lib/publish.ts)

## Phase 3: Push More Runtime Assembly To Publish Time

Why:
The repo already publishes `_content-index.json` and compiled MDX. The next win is to stop rebuilding nav/search/TOC/OpenAPI structures inside the request path.

### Deliverables

- [ ] Publish immutable JSON artifacts per deployment for:
  - [ ] resolved site config
  - [ ] navigation tree
  - [ ] flattened navigation
  - [ ] page metadata map
  - [ ] breadcrumbs map
  - [ ] TOC map by slug
  - [ ] search index
  - [ ] OpenAPI registry
  - [ ] `llms.txt`
  - [ ] `llms-full.txt`
- [ ] Version every artifact by deployment ID
- [ ] Keep runtime assembly only as an explicit fallback path

### File Targets

- [ ] Extend [`apps/api/src/lib/publish.ts](/Users/mblode/Code/mblode/blodemd/apps/api/src/lib/publish.ts) to emit the additional artifacts
- [ ] Add serializer/helpers in [`packages/previewing/src/index.ts](/Users/mblode/Code/mblode/blodemd/packages/previewing/src/index.ts) for the new artifact types
- [ ] Update [`packages/previewing/src/blob-source.ts](/Users/mblode/Code/mblode/blodemd/packages/previewing/src/blob-source.ts) to read typed deployment artifacts directly
- [ ] Refactor [`apps/docs/lib/docs-runtime.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/lib/docs-runtime.tsx) so:
  - [ ] `getTenantArtifacts()` loads prebuilt JSON first
  - [ ] `buildOpenApiRegistry()` becomes publish-time for public deployments
  - [ ] `buildSearchItems()` is removed from the hot path
  - [ ] page TOC reads from published artifact data where available

## Phase 4: Simplify The Root Host-Routed Surface

Why:
Once Edge Config lookup exists, the host-routed surface should collapse to “lookup, maybe redirect, rewrite to static tenant path”.

### Deliverables

- [ ] Keep `proxy.ts` responsible only for host resolution, redirect rules, and rewrites
- [ ] Remove remaining request-time docs-content decisions from the proxy path
- [ ] Make root tenant utility routes a thin host-aware rewrite or lookup layer

### File Targets

- [ ] Simplify [`apps/docs/proxy.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/proxy.ts)
- [ ] Audit and simplify:
  - [ ] [`apps/docs/app/robots.txt/route.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/app/robots.txt/route.ts)
  - [ ] [`apps/docs/app/sitemap.xml/route.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/app/sitemap.xml/route.ts)
  - [ ] [`apps/docs/app/llms.txt/route.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/app/llms.txt/route.ts)
  - [ ] [`apps/docs/app/llms-full.txt/route.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/app/llms-full.txt/route.ts)
  - [ ] [`apps/docs/app/llms.mdx/[[...slug]]/route.ts](/Users/mblode/Code/mblode/blodemd/apps/docs/app/llms.mdx/[[...slug]]/route.ts)
- [ ] Prefer host-aware rewrite to `/sites/[tenant]` over bespoke runtime rendering wherever possible

## Phase 5: Use `cacheComponents` Only For Residual Dynamic Work

Why:
The repo already has `cacheLife` config in [`apps/docs/next.config.js](/Users/mblode/Code/mblode/blodemd/apps/docs/next.config.js) but does not yet use `cacheComponents`. This should only be introduced after the static and publish-time wins are exhausted.

### Deliverables

- [ ] Audit what is still genuinely dynamic after Phases 2-4
- [ ] Enable `cacheComponents` only if there are remaining deterministic runtime reads worth caching
- [ ] Tag residual cached outputs so publish-time invalidation stays explicit

### Candidate Cached Functions

- [ ] `getTenantConfig`
- [ ] `getTenantSearchItems`
- [ ] residual preview-only loaders
- [ ] any root utility route helpers that cannot be fully rewritten

### Rules

- [ ] Do not migrate already-static tenant docs pages just for consistency
- [ ] Do not use Runtime Cache as a substitute for publish-time artifacts
- [ ] Keep cached scopes free of direct `headers()` and `cookies()` access

## Phase 6: JS Budget And Interactive Island Cleanup

Why:
The remaining client cost is now concentrated in global theme/search/mobile UI and API playground features.

### Targets

- [ ] Set a normal docs-article budget:
  - [ ] initial JS under 300 KB
  - [ ] CSS under 100 KB
  - [ ] zero always-mounted heavy command/search payloads until user intent

### Priority 1

- [ ] Audit [`apps/docs/components/providers.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/components/providers.tsx) and [`apps/docs/app/layout.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/app/layout.tsx)
- [ ] Decide whether `next-themes` remains worth a global client provider
- [ ] If not, replace it with a lighter server-first theme strategy plus a tiny hydration-free toggle path

### Priority 2

- [ ] Refactor [`apps/docs/components/ui/search.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/components/ui/search.tsx)
- [ ] Stop prefetching the full search index on hover/pointer enter
- [ ] Load the search payload only on real open intent or keyboard shortcut
- [ ] Consider splitting the command dialog body into a dynamic import

### Priority 3

- [ ] Re-check [`apps/docs/components/docs/mobile-nav.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/components/docs/mobile-nav.tsx)
- [ ] Keep it client-only if needed, but isolate it from the desktop shell
- [ ] Lazy-load any non-essential nested content or animation logic

### Priority 4

- [ ] Audit API reference interactivity:
  - [ ] [`apps/docs/components/api/api-playground.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/components/api/api-playground.tsx)
  - [ ] [`apps/docs/components/api/api-reference.tsx](/Users/mblode/Code/mblode/blodemd/apps/docs/components/api/api-reference.tsx)
- [ ] Keep playground JS off ordinary markdown docs pages
- [ ] Lazy-load playground UI only on pages that actually render OpenAPI operations

## Phase 7: Region, Pooling, And Auth Alignment

Why:
Static pages remove most latency, but the remaining control-plane work still needs sane placement.

- [ ] Confirm the Vercel project home region
- [ ] Confirm the Supabase primary region
- [ ] Align remaining Node compute with the Supabase region
- [ ] Use Supabase transaction pooling for any serverless Postgres access that remains
- [ ] Avoid `getUser()` on hot paths that only need JWT verification
- [ ] Prefer asymmetric signing keys and `getClaims()` for low-latency verification paths

## Phase 8: Re-benchmark Next.js Versus A Fully Headless Frontend

Why:
The right way to compare with Mintlify is after the Vercel-native plan is actually finished.

- [ ] Benchmark the improved Next.js path after Phases 1-7
- [ ] Compare against a small Astro/Starlight-style prototype only if the measured JS or ops profile is still unacceptable
- [ ] Evaluate:
  - [ ] shipped JS
  - [ ] cold and warm TTFB
  - [ ] operational complexity
  - [ ] multi-tenant routing complexity
- [ ] Only switch frameworks if the measured gain is large enough to justify the extra surface area

## Verification Checklist

- [ ] Live prod docs page returns cacheable/static behavior
- [ ] Warm docs requests are CDN-served
- [ ] Tenant search route is edge-cached and static
- [ ] Tenant utility routes stay static in build output and correct at runtime
- [ ] No public docs request hits Supabase or the docs API on a cache hit
- [ ] Proxy tenant lookup no longer depends on Postgres-backed API reads
- [ ] Request collapsing only matters on actual cold misses, not on every request
- [ ] Initial JS is materially lower than before the shell reductions
- [ ] Publish-time invalidation updates Edge Config and Blob artifacts together

## Sources

- Next.js `cacheComponents`: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- Next.js `use cache`: https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js public pages guide: https://nextjs.org/docs/app/guides/public-static-pages
- Vercel CDN overview: https://vercel.com/docs/cdn
- Vercel cache headers: https://vercel.com/docs/caching/cache-control-headers
- Vercel Edge Config: https://vercel.com/docs/edge-config
- Vercel function regions: https://vercel.com/docs/functions/configuring-functions/region
- Vercel Runtime Cache: https://vercel.com/docs/caching/runtime-cache
- Vercel request collapsing: https://vercel.com/docs/incremental-static-regeneration/request-collapsing
- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase Postgres connections: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase read replicas: https://supabase.com/docs/guides/platform/read-replicas
- Supabase `getClaims()`: https://supabase.com/docs/reference/javascript/auth-getclaims
- Supabase `getUser()`: https://supabase.com/docs/reference/javascript/auth-getuser
- Supabase signing keys: https://supabase.com/docs/guides/auth/signing-keys
- Mintlify custom frontend: https://www.mintlify.com/docs/guides/custom-frontend
