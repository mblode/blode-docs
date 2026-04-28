# Architecture & System Boundaries

## Tenant type lives in two packages

`Tenant` is defined in **both** `@repo/contracts` (Zod-validated, returned by the API and embedded in edge config records) and `@repo/models` (plain TS interface used by `apps/docs` render code). The shapes are structurally identical; neither imports the other. When adding a field to one you must also add it to the other, or edge-config serialisation will silently drop the field on the render side.

## Tenant config flows through request headers, not DB reads

`apps/docs/proxy.ts` resolves the tenant once per request and serialises the full `Tenant` into `x-tenant-*` headers (see `apps/docs/lib/tenant-headers.ts`). Server components read those headers via `next/headers` — they do **not** hit the DB or the API. Rich nested config (e.g. analytics) is `encodeURIComponent`-wrapped JSON in a single header (portable across Edge/Node/Bun — `Buffer.from(…, 'base64url')` is unreliable on Vercel Edge Runtime). This is why tenant config propagation is instant after an edge-config sync — there is no cache to invalidate in the docs app itself.

## Edge config is the source of truth at request time

`syncProjectTenantEdgeConfig(projectId)` runs after every project mutation (`apps/api/src/routes/projects.ts`). It rebuilds the tenant via `buildTenant()` (`apps/api/src/lib/tenant-builder.ts`) and upserts `TenantEdgeSlugRecord` + `TenantEdgeHostRecord` into Vercel Edge Config. `buildTenant` is the single site that maps a project row to the public `Tenant` shape — any new tenant-visible field needs a pass-through here.

## Analytics are client-safe, tenant-scoped, public tokens

Per-tenant analytics (GA4 measurement ID, PostHog project API key) are treated as **tenant configuration**, not secrets. They are stored as JSONB on `projects.analytics`, flow through the public `Tenant` contract, and land in the browser as-is. PostHog `phx_*` personal API keys are rejected by contract and CLI validators — they carry far more privilege than a write-only project key.

## Analytics are production-only

`<TenantAnalytics>` (`apps/docs/components/tenant-analytics.tsx`) short-circuits unless `VERCEL_ENV === "production"`. This means GA/PostHog never fires from local `next dev`, the CLI `dev-server`, or preview deployments — tenant metrics stay clean. Blodemd's own GA is a separate code path (`apps/docs/components/third-parties.tsx`, driven by `NEXT_PUBLIC_BLODEMD_GA_ID`) and follows the same gate.

## llms-full.txt sanitisation runs before content emission

`apps/docs/lib/tenant-static.ts` exposes two layers of cleaning that **both** run on every page's markdown before it lands in `llms-full.txt` (and per-segment outputs):

- `sanitizePlaceholderUrls` — neutralises placeholder hosts that would 404 in link-resolution checks (Mintlify-style AFDocs auditors fetch every URL inside llms-full). Current arms cover `*.example.{com,org,net}`, `discord.gg/example`, RFC 6761 `*.test`/`*.invalid`, `localhost(:port)`, `your[-_]?domain.*`, `acme.blode.md`, and `github.com/example/*`. Markdown-link form (`[label](url)`) collapses to bare label; bare URLs get backtick-wrapped.
- `absolutiseInternalLinks` — rewrites root-relative MDX links (e.g. `[Navigation](/configuration/navigation)`) to absolute origin+basePath URLs so external link checkers don't treat the path as opaque.

Add new placeholder hostnames to `PLACEHOLDER_URL_PATTERN` rather than rewriting MDX — keeps docs realistic and centralises the safety net. Both helpers have unit tests in `apps/docs/lib/tenant-static.unit.test.ts`.

## Per-page DOM weight: gate Popover children behind `open`

`apps/docs/components/docs/mobile-nav.tsx` and `apps/docs/components/docs/contextual-menu.tsx` wrap their inner trees in `{open ? (...) : null}` inside `<PopoverContent>`. base-ui's portal still mounts the Popup wrapper, but skipping the children removes the per-page nav-tree / icon-list duplicate from SSR HTML. AFDocs samples HTML→markdown size; the duplicate counted as boilerplate inflating pages above 100K. When adding a new heavy popover-driven menu, follow the same `open ? children : null` pattern — `next/dynamic` with `ssr: false` is not allowed in the parent server components (e.g. `doc-shell.tsx`, `doc-header.tsx`).

## motion `useScroll` accelerates preset offsets to CSS `view-timeline` — `contain` trap

motion v12's `useScroll({ target })` auto-accelerates to CSS `view-timeline` when the offset (or lack of one) normalises to a preset in `node_modules/framer-motion/.../offset-to-range.mjs`: `Enter`→`entry`, `Exit`→`exit`, `Any`→`cover`, **`All`→`contain`**. Crucially, `undefined` _and_ `["start start","end end"]` both reduce to `All`/`contain`. The CSS `contain` named range collapses to **zero length** whenever the target is taller than the scrollport, so `scrollYProgress` stalls mid-scroll — the exact symptom that bit the marketing TextReveal (200vh target in a 100vh viewport; words stuck at ~40% reveal). The JS listener still runs but the consuming `<motion.*>` prefers the stuck CSS-driven path. Force the JS path with a non-preset offset — `["start end","end start"]` is the canonical escape hatch; see `apps/web/components/ui/text-reveal.tsx`.
