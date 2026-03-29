# Blode.md: architecture for a headless, open-source Mintlify alternative

**Blode.md can be built as a single Next.js/fumadocs deployment on Vercel that serves every project's docs on its own custom domain, using middleware-based tenant routing, blob-stored MDX pushed via CLI or GitHub App, and on-demand ISR for instant content updates — all without per-project rebuilds.** This architecture mirrors Mintlify's proven approach (one Vercel project serving 2,500+ custom domains) but strips it down to an open-source, headless core. The key enablers are Vercel's Platforms Starter Kit pattern, fumadocs' `multiple()` source API with `@fumadocs/mdx-remote` for runtime compilation, and a SHA-based incremental push flow. What follows is a complete blueprint.

---

## How Mintlify actually works — and where Blode.md diverges

Mintlify runs **one Next.js application on a single Vercel project** that serves every customer's documentation site. Co-founder Hahnbee Lee confirmed this directly: "Multi-tenancy and all the custom domains connecting to one Vercel project is so epic." As of mid-2024, that single deployment handled **2,500+ custom domains** with automatic SSL. Content never triggers a full rebuild — Mintlify uses ISR so updates propagate in seconds via on-demand revalidation.

The content pipeline is GitHub-first. There is no `mintlify deploy` command. Users install a GitHub App that watches their repo; pushing to the default branch fires a webhook, Mintlify pulls the content, processes the MDX, and triggers ISR revalidation. PR-based preview deployments are automatic. The CLI (`mint dev`) exists solely for local preview — it bundles a local copy of the Mintlify rendering engine and serves it on `localhost:3000`.

Mintlify's config file (`docs.json`, formerly `mint.json`) controls everything: **9 theme presets**, custom colors/logos/fonts, recursive navigation structure with tabs and groups, API playground configuration, analytics integrations, SEO settings, redirects, and even AI assistant behavior. The MDX rendering layer is open-source — `@mintlify/mdx` wraps `next-mdx-remote-client` with syntax highlighting, and `@mintlify/components` provides Tailwind-based React components (Accordion, Card, Tabs, CodeBlock, etc.).

**Where Blode.md diverges**: Mintlify's rendering engine and platform are proprietary (Elastic-2.0 license). Blode.md can be fully open-source, built on fumadocs (which is MIT-licensed and more composable), and self-hostable. Mintlify recently added an enterprise "custom frontend" option using Astro — acknowledging that developers want control over their rendering layer. Blode.md is headless from day one.

---

## The central app: multi-tenant Next.js with fumadocs

### Middleware-based domain routing

The core of the architecture is a Next.js middleware that intercepts every request, identifies the tenant from the hostname, and rewrites the URL to a tenant-scoped route. This follows Vercel's Platforms Starter Kit pattern exactly:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/edge-config";

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // Skip internal routes
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Resolve tenant: check subdomain first, then custom domain
  let projectSlug: string | null = null;

  if (hostname.endsWith(".blodemd.app")) {
    projectSlug = hostname.replace(".blodemd.app", "");
  } else {
    // Custom domain lookup via Edge Config (sub-10ms)
    const mapping = await get<string>(`domain:${hostname}`);
    projectSlug = mapping ?? null;
  }

  if (!projectSlug) {
    return NextResponse.rewrite(new URL("/404", request.url));
  }

  // Rewrite to tenant-scoped route
  const response = NextResponse.rewrite(
    new URL(`/docs/${projectSlug}${request.nextUrl.pathname}`, request.url)
  );
  response.headers.set("x-project-slug", projectSlug);
  return response;
}
```

**Edge Config is critical here.** Storing the `domain → projectSlug` mapping in Vercel Edge Config gives sub-10ms lookups at the edge, avoiding a database round-trip on every request. The mapping is updated whenever a custom domain is added or removed via the API.

### Fumadocs integration for multi-project rendering

Fumadocs is well-suited for this because it operates on **virtual file systems**, not the real filesystem. The `Source` interface accepts any array of virtual files, and the `multiple()` API combines sources. For Blode.md, the key is `@fumadocs/mdx-remote` — it compiles MDX at runtime from any source (blob storage, database, API) without a build step:

```typescript
// app/docs/[project]/[[...slug]]/page.tsx
import { compileMDX } from "@fumadocs/mdx-remote";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { getProjectContent, getProjectConfig } from "@/lib/content";

export default async function ProjectDocPage({
  params,
}: {
  params: Promise<{ project: string; slug?: string[] }>;
}) {
  const { project, slug } = await params;
  const path = slug?.join("/") ?? "index";

  // Fetch raw MDX from blob storage
  const { content, frontmatter } = await getProjectContent(project, path);
  const config = await getProjectConfig(project);

  // Compile MDX at runtime (cached by ISR)
  const compiled = await compileMDX({ source: content });
  const MdxContent = compiled.body;

  return (
    <DocsPage toc={compiled.toc}>
      <DocsBody>
        <MdxContent components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
```

Each project gets its own dynamic route segment (`/docs/[project]/`), but users never see this — middleware rewrites `docs.acme.com/quickstart` to `/docs/acme/quickstart` transparently. Per-project layouts apply branding (colors, logos, fonts) by reading the project's `blodemd.json` config from the database and injecting CSS variables.

### Per-project theming via CSS variables

Fumadocs uses `fd-`-prefixed CSS variables for all theming. Each project's layout wrapper injects its brand colors dynamically:

```typescript
// app/docs/[project]/layout.tsx
export default async function ProjectLayout({ params, children }) {
  const config = await getProjectConfig(params.project);

  return (
    <div style={{
      "--fd-primary": config.colors.primary,
      "--fd-background": config.colors.background ?? "0 0% 100%",
    } as React.CSSProperties}>
      <DocsLayout
        nav={{ title: config.name }}
        sidebar={{ ... }}
        logo={<img src={config.logo.light} alt={config.name} />}
      >
        {children}
      </DocsLayout>
    </div>
  );
}
```

This gives complete per-project branding isolation — different logos, colors, fonts, and navigation structures — all within one deployment.

---

## Content storage: blob + database hybrid

After evaluating four storage strategies (git-based, blob, database, hybrid), **the hybrid approach wins for Blode.md**: blob storage for MDX content, a database for metadata and config.

| Layer               | Storage                            | What lives here                                                                        | Why                                                            |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Raw MDX**         | Cloudflare R2 or Vercel Blob       | `.mdx` files, images, assets                                                           | Cheap ($0/GB for R2 free tier), fast CDN reads, simple PUT/GET |
| **Compiled cache**  | Same blob, separate prefix         | Pre-compiled MDX output                                                                | Avoids re-compilation on every ISR hit                         |
| **Metadata**        | Turso (SQLite at edge) or Postgres | Project configs, navigation trees, deployment history, domain mappings, file manifests | Structured queries, version tracking, fast edge reads          |
| **Source of truth** | User's own Git repo                | Everything                                                                             | Blode.md never becomes the git host                             |

**Storage key scheme for blob:**

```
/{projectId}/deployments/{deploymentId}/docs/getting-started.mdx
/{projectId}/deployments/{deploymentId}/blodemd.json
/{projectId}/deployments/{deploymentId}/assets/logo.svg
/{projectId}/current → symlink/pointer to latest deploymentId
```

**Content fetch path at runtime:**

1. Middleware resolves hostname → `projectSlug`
2. Page component reads `projectSlug` + `slug` path
3. Fetches current deployment pointer from database (cached)
4. Reads MDX from blob storage at `/{projectId}/deployments/{current}/docs/{slug}.mdx`
5. Compiles with `@fumadocs/mdx-remote` (result cached by ISR)
6. On-demand revalidation clears cache when new content is pushed

**Rollback is trivial**: update the `current` deployment pointer in the database to any previous `deploymentId`. All previous content remains in blob storage.

---

## CLI design: `blodemd push`

The CLI follows the Vercel/Netlify pattern of **SHA-based incremental sync** — only changed files are uploaded. The CLI is the secondary deployment method (GitHub App is primary).

### Core commands

```bash
blodemd init          # Interactive setup: create blodemd.json, link project
blodemd dev           # Local preview (wraps fumadocs dev server)
blodemd push          # Sync docs to platform
blodemd push --preview # Create preview deployment
blodemd domains add docs.acme.com  # Add custom domain
blodemd status        # Check deployment status
```

### How `blodemd push` works

```
1. Read blodemd.json (validate against schema)
2. Scan content directory (default: ./docs/)
3. Compute SHA-256 hash of every file
4. POST /api/v1/deployments/prepare
   → Send file manifest (path + hash + size for each file)
   → Receive: deploymentId + list of files that need uploading + presigned URLs
5. Upload only changed files directly to blob storage via presigned URLs
   → Parallel uploads with progress bar
6. POST /api/v1/deployments/{id}/finalize
   → Platform processes MDX, updates metadata, triggers ISR revalidation
7. Poll /api/v1/deployments/{id}/status until ready
8. Print deployment URL
```

**Key design decisions:**

- **Presigned URLs** for direct-to-blob uploads avoid proxying large files through the API server
- **Content-addressed storage** means unchanged files are never re-uploaded, even across deployments
- **Project linking** via `.blodemd/` directory (stores project ID and API key locally, gitignored)
- **API keys** use a clear prefix: `nd_live_sk_` for production, `nd_test_sk_` for preview
- **CI mode**: `BLODEMD_API_KEY` env var + `--ci` flag for non-interactive use

### Authentication flow

```bash
blodemd login         # Opens browser OAuth flow, stores token in ~/.blodemd/auth.json
blodemd init          # Links current dir to a project, stores in .blodemd/project.json
```

For CI/CD, a project-scoped API key replaces the OAuth token.

---

## GitHub App and GitHub Action alternatives

### GitHub App (primary, recommended)

The GitHub App is the zero-config option. After installation:

1. User installs the Blode.md GitHub App on their repo
2. App receives `push` webhook on default branch
3. Blode.md backend pulls changed files via GitHub API (using installation token)
4. Runs the same pipeline as CLI push: store in blob → update metadata → revalidate ISR
5. PR pushes create preview deployments; bot comments with preview URL

**Permissions needed**: `contents: read`, `pull_requests: write` (for preview comments), `metadata: read`.

### GitHub Action (CI flexibility)

```yaml
# .github/workflows/blodemd.yml
name: Deploy Docs
on:
  push:
    branches: [main]
    paths: ["docs/**", "blodemd.json"]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: blodemd/deploy-action@v1
        with:
          api-key: ${{ secrets.BLODEMD_API_KEY }}
          docs-dir: ./docs
```

The Action internally runs the same SHA-based incremental sync as the CLI. It's useful for monorepos, custom build steps before pushing, or organizations that prefer Actions over GitHub Apps.

---

## The `blodemd.json` config schema

Inspired by Mintlify's `docs.json` but simplified for a headless, open-source context. Only **three fields are required**: `name`, `colors.primary`, and `navigation`.

```jsonc
{
  "$schema": "https://blodemd.app/schema.json",

  // Identity (required)
  "name": "Acme Docs",
  "slug": "acme",

  // Branding
  "logo": {
    "light": "./assets/logo-light.svg",
    "dark": "./assets/logo-dark.svg",
  },
  "favicon": "./assets/favicon.svg",
  "colors": {
    "primary": "#6366f1", // Required
    "light": "#818cf8", // Light mode accent (optional)
    "dark": "#4f46e5", // Dark mode accent (optional)
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "code": "JetBrains Mono",
  },

  // Navigation (required, recursive Mintlify-style structure)
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["index", "quickstart", "installation"],
    },
    {
      "tab": "API Reference",
      "groups": [
        { "group": "Auth", "pages": ["api/auth", "api/tokens"] },
        { "group": "Resources", "pages": ["api/users", "api/projects"] },
      ],
    },
  ],

  // Content source
  "content": {
    "dir": "./docs", // Relative path to MDX files (default: ./docs)
  },

  // Domain
  "domain": "docs.acme.com", // Custom domain (optional, defaults to {slug}.blodemd.app)

  // Top bar
  "topbar": {
    "links": [
      {
        "label": "GitHub",
        "href": "https://github.com/acme/acme",
        "icon": "github",
      },
    ],
    "cta": { "label": "Get Started", "href": "https://app.acme.com" },
  },

  // SEO
  "seo": {
    "titleTemplate": "%s — Acme Docs",
    "ogImage": "./assets/og.png",
  },

  // OpenAPI spec (optional)
  "openapi": "./openapi.yaml",

  // Redirects
  "redirects": [{ "from": "/old-path", "to": "/new-path" }],
}
```

**Design principles**: JSON with `$schema` for IDE autocompletion. Recursive navigation (Mintlify's proven structure). Sensible defaults for everything except the three required fields. Support `$ref` for splitting large configs into multiple files.

---

## Custom domains: programmatic setup via Vercel API

Adding a custom domain is a three-step process triggered by `blodemd domains add` or the dashboard:

**Step 1 — Register domain with Vercel:**

```typescript
import { projectsAddProjectDomain } from "@vercel/sdk/funcs/projectsAddProjectDomain.js";

await projectsAddProjectDomain(vercel, {
  idOrName: "blodemd-platform",
  teamId: VERCEL_TEAM_ID,
  requestBody: { name: "docs.acme.com" },
});
```

**Step 2 — User configures DNS:**
The platform returns the required DNS records. For a subdomain like `docs.acme.com`, it's a CNAME pointing to `cname.vercel-dns.com`. The dashboard shows verification status, polling via:

```typescript
await projectsVerifyProjectDomain(vercel, {
  idOrName: "blodemd-platform",
  domain: "docs.acme.com",
});
```

**Step 3 — Update Edge Config mapping:**
Once verified, add the `domain → projectSlug` mapping to Edge Config so middleware can resolve it:

```typescript
await edgeConfig.set(`domain:docs.acme.com`, "acme");
```

SSL certificates are provisioned automatically by Vercel (Let's Encrypt) once DNS propagates. **No manual SSL configuration is needed.**

For the default experience, `*.blodemd.app` is configured as a wildcard domain on the Vercel project, giving every project `{slug}.blodemd.app` out of the box. This requires Vercel's nameservers for the `blodemd.app` domain.

---

## Build and deploy strategy: ISR with tiered revalidation

The central app is **never fully rebuilt** when a single project's content changes. This is the critical scaling insight from Mintlify's architecture. Instead, Blode.md uses a tiered revalidation strategy:

**Tier 1 — Content-only changes** (MDX files modified): On-demand `revalidateTag` for each changed page. The push pipeline knows exactly which files changed (from the SHA diff), so it revalidates only those paths. Sub-second updates.

```typescript
// After deployment finalize
for (const changedFile of deployment.changedFiles) {
  revalidateTag(`content:${projectId}:${changedFile}`);
}
```

**Tier 2 — Config changes** (`blodemd.json` modified): `revalidateTag` for the entire project. This refreshes navigation, theming, and all pages.

```typescript
revalidateTag(`project:${projectId}`);
```

**Tier 3 — Platform updates** (new fumadocs version, component changes): Full redeploy via Vercel deploy hook. Rare — only for platform-level changes.

**Safety net**: Time-based revalidation (`revalidate = 3600`) ensures pages refresh within an hour even if on-demand revalidation fails.

**Important caveat discovered in research**: `revalidatePath` does not reliably scope to a single tenant in middleware-rewritten multi-tenant apps (Next.js issue #59825). **`revalidateTag` is the correct approach** — tag every data fetch with `content:${projectId}:${slug}` and revalidate by tag.

---

## Complete system architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Git Repo                       │
│   docs/*.mdx  +  blodemd.json  +  assets/             │
└──────────┬──────────────────────┬────────────────────────┘
           │                      │
     CLI: blodemd push    GitHub App webhook
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Blode.md API Server                    │
│                                                          │
│  POST /deployments/prepare  → SHA diff, return missing   │
│  PUT  (presigned URLs)      → Direct-to-blob upload      │
│  POST /deployments/finalize → Process + revalidate       │
│                                                          │
│  POST /domains/add          → Vercel API + Edge Config   │
│  GET  /domains/verify       → DNS check                  │
└─────────┬──────────────┬───────────────┬─────────────────┘
          │              │               │
          ▼              ▼               ▼
   ┌────────────┐ ┌───────────┐ ┌──────────────────┐
   │ Blob Store │ │ Database  │ │ Vercel Edge       │
   │ (R2 or     │ │ (Turso /  │ │ Config            │
   │  Vercel    │ │  Postgres)│ │                    │
   │  Blob)     │ │           │ │ domain:acme.com    │
   │            │ │ projects  │ │  → "acme"          │
   │ raw MDX    │ │ deploys   │ │ domain:beta.io     │
   │ assets     │ │ configs   │ │  → "beta"          │
   │ compiled   │ │ manifests │ │                    │
   └──────┬─────┘ └─────┬─────┘ └────────┬───────────┘
          │              │                │
          └──────────────┼────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Single Next.js Deployment on Vercel            │
│                                                          │
│  middleware.ts                                            │
│    → Read hostname                                       │
│    → Lookup project via Edge Config (<10ms)               │
│    → Rewrite to /docs/[project]/[[...slug]]              │
│                                                          │
│  app/docs/[project]/layout.tsx                           │
│    → Load project config from DB                         │
│    → Apply per-project branding (CSS vars, logo, fonts)  │
│    → Render fumadocs DocsLayout with project navigation  │
│                                                          │
│  app/docs/[project]/[[...slug]]/page.tsx                 │
│    → Fetch MDX from blob storage                         │
│    → Compile with @fumadocs/mdx-remote                   │
│    → Render with fumadocs-ui components                  │
│    → Cache via ISR, tagged per project+page              │
│                                                          │
│  *.blodemd.app (wildcard) + custom domains via API     │
└─────────────────────────────────────────────────────────┘
```

---

## How Blode.md is simpler and more headless than Mintlify

Mintlify is a polished commercial product with a web editor, team management, analytics dashboards, AI assistant, and dozens of integrations. Blode.md deliberately omits all of that to focus on the infrastructure layer.

**What Blode.md keeps**: Multi-tenant custom domain routing, ISR-based content delivery, MDX rendering with rich components, per-project branding, CLI push workflow, GitHub integration, config-driven navigation. These are the hard infrastructure problems that every docs platform needs to solve.

**What Blode.md drops**: Web WYSIWYG editor, team/permissions management, built-in analytics dashboards, AI chat assistant, proprietary themes, managed search (users bring their own Algolia/Orama). This keeps the platform lean, self-hostable, and composable.

**Where Blode.md can be better**: Full source access means users can customize every component. Fumadocs' headless `fumadocs-core` layer means the rendering can be completely replaced while keeping the content infrastructure. The CLI-first approach with `blodemd push` gives explicit control that Mintlify's purely Git-triggered model doesn't offer. And being open-source means no vendor lock-in — the entire platform can be forked and self-hosted on any Vercel-compatible infrastructure.

The key technical risk is **fumadocs' remote MDX limitations** — `@fumadocs/mdx-remote` doesn't support imports/exports in MDX files, and search indexing for remote content requires manual setup rather than fumadocs' auto-generated indexes. Both are solvable: custom components are injected at compile time (not imported), and Orama Cloud or Algolia handle search independently of the content source. The single-maintainer risk on fumadocs is real but mitigated by its MIT license and growing adoption (used by Vercel, Unkey, and Orama themselves).

## Conclusion

The architecture reduces to a surprisingly simple core: **one Next.js app, one Vercel project, middleware that maps domains to projects, blob storage for content, a database for metadata, and ISR for instant updates without rebuilds.** Mintlify proved this scales to thousands of tenants. Fumadocs provides the composable rendering layer. The CLI and GitHub App handle content ingestion. Vercel's Domains API and Edge Config handle the multi-tenant plumbing.

The most important implementation order is: (1) get middleware-based multi-tenant routing working with hardcoded content, (2) add blob storage and the `blodemd push` CLI, (3) implement on-demand ISR revalidation, (4) build the GitHub App, (5) add custom domain management via Vercel API. Each step is independently valuable, and the system is usable after step 2.
