What you want is doable, but I would not build it as “a library that each repo runs.” I would build it as one hosted multi-tenant docs runtime on Vercel, plus a very thin publishing protocol. The `seamapi/blodemd` repo I could find is basically a Mintlify-style content repo: generated from `mintlify/starter`, mostly MDX, with a `mint.json`, and publishing driven by a GitHub App. That is the right authoring shape; the main change is moving rendering, routing, and domains into one central app instead of one app per repo. ([GitHub][1])

Fumadocs is already flexible enough for this. Its `loader()` is server-side, works from in-memory content, and can take custom sources instead of a local filesystem. Its `Source` API supports virtual paths, and Fumadocs explicitly documents remote sources and on-demand MDX compilation as a fit for large remote docs setups. ([Fumadocs][2])

So I would make every project repo content-only: `docs/**/*.mdx`, assets, and a non-executable config file like `blodemd.json`. No per-repo Next app, no per-repo Fumadocs setup, no dashboard. The only Next.js app lives centrally on Vercel. It resolves the site from the hostname and renders through a Fumadocs custom source. That maps cleanly onto Vercel’s multi-tenant model, where one codebase serves many subdomains and custom domains, with programmatic domain management and automatic SSL. ([Vercel][3])

For storage, I would use Blob for versioned docs bundles and Edge Config only for tiny routing metadata such as `hostname -> siteSlug` and `siteSlug -> currentVersion`. That is the cleanest fit with Vercel’s products: Blob is the file/object store, while Edge Config is the low-latency config store. Blob content is CDN-cached, Edge Config is meant for fast global reads, and Edge Config writes propagate in seconds, so you can publish by uploading a new versioned bundle and then flipping the “current version” pointer without redeploying the central app. Also keep the page tree separate and small, because Fumadocs sends it to the client and explicitly warns against putting large data there. ([Vercel][4])

That gives you a publish flow like this: build a bundle from MDX/frontmatter/assets, upload `manifest.json`, `page-tree.json`, `search.json`, page bodies, and assets under a version key such as the commit SHA, then update the Edge Config pointer. If you architect it that way, you do not need to redeploy the central app for doc changes. Vercel Deploy Hooks are only useful if you choose a rebuild-based model instead; they are meant for content-change integrations, but they still depend on a connected Git repo. ([Vercel][5])

For domains, support both a default wildcard like `project.docs.yourcompany.com` and branded domains like `docs.project.com`. Vercel supports programmatic domain attachment for multi-tenant apps, subdomains are configured with CNAMEs, wildcard domains require nameserver-based verification, and Vercel will issue SSL once the domain is added and verified. If the same docs are reachable on both a wildcard subdomain and a custom domain, store a canonical URL and redirect to the primary host to avoid duplicate-content SEO problems. ([Vercel][6])

I would not make private reusable workflows the main distribution mechanism if these repos span multiple orgs. Reusable workflows are great inside one org, but private ones need explicit access policies and are more friction across org boundaries. My recommendation is: ship a public `blodemd/publish-action` first because it is the fastest v1, then add a GitHub App as the long-term UX. GitHub Apps can be installed on orgs or personal accounts, restricted to selected repositories, and subscribed to webhook events according to the permissions they request. If the app needs to read private repo contents over Git, `Contents` permission is the key permission. ([GitHub Docs][7])

The one hard constraint I would enforce is content-only MDX. Fumadocs MDX Remote is a good fit here because it compiles on demand, but it does not support `import`/`export` in MDX and it expects trusted content. On Vercel, local `public`-folder image assumptions also break for this remote model, so image references should resolve to URLs. In practice that means shared central components only — callouts, tabs, steps, cards, code groups, API blocks — and no repo-local React components. That is exactly what makes the setup instant. ([Fumadocs][8])

The package split I’d use is straightforward: `apps/web` for the hosted renderer, `packages/source` for the Fumadocs adapter over remote bundles, `packages/publisher` for bundle generation and upload, `packages/schema` for config/frontmatter validation, `packages/cli` for `init`, `publish`, and `domains`, and `packages/action` for the GitHub Action wrapper.

A good repo-level config would look like this:

```json
{
  "$schema": "https://blodemd.vercel.app/schema.json",
  "site": "acme-sdk",
  "title": "Acme SDK",
  "description": "JavaScript SDK documentation",
  "docsDir": "docs",
  "canonicalUrl": "https://docs.acme.com",
  "domains": ["docs.acme.com"],
  "theme": {
    "logo": "docs/logo.svg",
    "accentColor": "violet"
  },
  "navigation": {
    "mode": "filesystem"
  }
}
```

And the v1 publish workflow should be tiny:

```yaml
name: Publish docs

on:
  push:
    branches: [main]
    paths:
      - "docs/**"
      - "blodemd.json"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: blodemd/publish-action@v1
        with:
          config: blodemd.json
          publish-token: ${{ secrets.BLODEMD_PUBLISH_TOKEN }}
```

If I were building this, v1 would be one central Vercel app, Blob plus Edge Config, a public publish action, a JSON config, and a strict shared-component MDX model. That gets you most of Mintlify’s useful surface area without rebuilding their dashboard. The GitHub App is v2, not v1.

[1]: https://github.com/seamapi/blodemd "https://github.com/seamapi/blodemd"
[2]: https://www.fumadocs.dev/docs/headless/source-api "https://www.fumadocs.dev/docs/headless/source-api"
[3]: https://vercel.com/docs/multi-tenant "https://vercel.com/docs/multi-tenant"
[4]: https://vercel.com/docs/vercel-blob "https://vercel.com/docs/vercel-blob"
[5]: https://vercel.com/docs/deploy-hooks "https://vercel.com/docs/deploy-hooks"
[6]: https://vercel.com/docs/multi-tenant/domain-management "https://vercel.com/docs/multi-tenant/domain-management"
[7]: https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows "https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows"
[8]: https://preview.fumadocs.dev/docs/integrations/content/mdx-remote "https://preview.fumadocs.dev/docs/integrations/content/mdx-remote"
