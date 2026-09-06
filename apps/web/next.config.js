const rawDocsAppUrl = (process.env.DOCS_APP_URL ?? "").trim();
const rawDashboardAppUrl = (process.env.DASHBOARD_APP_URL ?? "").trim();
const rawPlatformRootDomain = (process.env.PLATFORM_ROOT_DOMAIN ?? "").trim();
const platformRootDomain = rawPlatformRootDomain || "blode.md";
const isVercelRuntime = process.env.VERCEL === "1";
const docsAppUrl =
  rawDocsAppUrl ||
  (isVercelRuntime
    ? `https://docs.${platformRootDomain}`
    : "http://127.0.0.1:3001");
// Dashboard traffic must not fall back to docs. If it does, `/app` gets
// treated as tenant/docs traffic and 404s instead of reaching auth.
const dashboardAppUrl =
  rawDashboardAppUrl ||
  (isVercelRuntime
    ? `https://app.${platformRootDomain}`
    : "http://127.0.0.1:3002");

// The docs build serves its chunks under this prefix so they never collide with
// the marketing build's own `/_next/*`. Keep in sync with `assetPrefix` in
// apps/docs/next.config.js.
const DOCS_ASSET_PREFIX = "/_docs";

// Same idea for the dashboard build. Keep in sync with `assetPrefix` in
// apps/dashboard/next.config.js.
const DASHBOARD_ASSET_PREFIX = "/_app";

const isDev = process.env.NODE_ENV === "development";

// Safe on every response this app serves, including the ones it only proxies:
// none of them can change how a page renders.
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Not a robots.txt field. Agents that implement Content-Signal read this
  // header; Semrush treats the same line in robots.txt as invalid syntax.
  {
    key: "Content-Signal",
    value: "search=yes, ai-input=yes, ai-train=yes",
  },
];

// PostHog runs through the `s.blode.md` reverse proxy, so one origin covers the
// SDK's own script loads and its ingest calls. Unset at build time means
// analytics is off (instrumentation-client soft no-ops) and the directive is
// simply narrower.
const posthogOrigin = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "").trim();
const posthogSource = posthogOrigin ? ` ${posthogOrigin}` : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${posthogSource}`,
  `connect-src 'self'${posthogSource}`,
  // Remote images are configured for Vercel Blob. next/image serves them back
  // through `/_next/image` on this origin, but an unoptimized one would not.
  "img-src 'self' data: https://*.public.blob.vercel-storage.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// The CSP and the frame policy describe the marketing pages, and only those.
// Everything below is rewritten to the docs or dashboard build, and a header
// set here still lands on the proxied response: tenant docs render customer
// MDX with arbitrary images, `<Iframe>` embeds and a per-tenant PostHog host,
// so this policy would break them. Those apps set their own headers.
const PROXIED_PREFIXES = [
  "_app",
  "_docs",
  "\\.well-known",
  "api",
  "app",
  "docs",
  "docs\\.json",
  "llms-full\\.txt",
  "llms\\.txt",
  "oauth",
  "sites",
];
// A `/:path(...)` source needs a non-empty segment, so `/` is matched
// separately rather than folded in here.
const MARKETING_PATHS = `/:path((?!${PROXIED_PREFIXES.join("|")}).*)`;

const marketingSecurityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  experimental: {
    // A bail-out from prerendering throws. Without this every cached GET logs a
    // stack trace during the build that means nothing.
    hideLogsAfterAbort: true,
    // Runs the React Compiler inside Turbopack rather than Babel.
    turbopackRustReactCompiler: true,
    // Hold a navigation pending through a connectivity drop and retry on
    // reconnect, instead of throwing.
    useOffline: true,
  },
  headers() {
    const agentDiscoveryLink = [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</docs/api/overview>; rel="service-doc"; type="text/html"',
      '</api/openapi.json>; rel="service-desc"; type="application/json"',
      '</.well-known/agent-skills/index.json>; rel="https://agentskills.io/rel/skills-index"; type="application/json"',
      '</.well-known/mcp/server-card.json>; rel="https://modelcontextprotocol.io/rel/server-card"; type="application/json"',
      '</.well-known/oauth-authorization-server>; rel="https://datatracker.ietf.org/doc/html/rfc8414"; type="application/json"',
      '</.well-known/oauth-protected-resource>; rel="https://datatracker.ietf.org/doc/html/rfc9728"; type="application/json"',
      '</.well-known/openid-configuration>; rel="http://openid.net/specs/connect/1.0/issuer"; type="application/json"',
      '</sitemap.xml>; rel="sitemap"; type="application/xml"',
      '</llms.txt>; rel="https://llmstxt.org/rel/llms-txt"; type="text/plain"',
    ].join(", ");
    // Every matching rule applies in array order and a later value wins per
    // header key, so the catch-all goes first and the narrower rules after it.
    //
    // `/:path*` is the house form for a catch-all. `/(.*)` works here, but it
    // stops matching the bare root once an app sets a `basePath`, so the fleet
    // uses the one form that is correct in both cases.
    return [
      {
        headers: baseSecurityHeaders,
        source: "/:path*",
      },
      {
        headers: marketingSecurityHeaders,
        source: "/",
      },
      {
        headers: marketingSecurityHeaders,
        source: MARKETING_PATHS,
      },
      {
        headers: [{ key: "Link", value: agentDiscoveryLink }],
        source: "/",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/markdown/*": ["./app/markdown/content/**/*.md"],
  },
  partialPrefetching: true,
  reactCompiler: true,
  rewrites() {
    return {
      // afterFiles: filesystem routes like /robots.txt win first. IndexNow
      // requires https://blode.md/<key>.txt; Next cannot parse app/[key].txt
      // as a dynamic segment (typegen sees empty params), so rewrite here.
      afterFiles: [
        {
          destination: "/indexnow/key/:key",
          source: "/:key.txt",
        },
      ],
      beforeFiles: [
        // Prefixed docs chunks. Unlike the Referer rules below this needs no
        // hint from the client, so crawlers that omit Referer still get the
        // real asset instead of a 404.
        //
        // The prefix is stripped here rather than by the docs app. A Next
        // rewrite cannot target `/_next/*` -- the destination is reserved and
        // silently falls through to the tenant catch-all -- so docs only ever
        // serves these at their unprefixed path.
        {
          destination: `${docsAppUrl}/_next/:path*`,
          source: `${DOCS_ASSET_PREFIX}/_next/:path*`,
        },
        {
          destination: `${dashboardAppUrl}/_next/:path*`,
          source: `${DASHBOARD_ASSET_PREFIX}/_next/:path*`,
        },
        { destination: `${docsAppUrl}/docs`, source: "/docs" },
        { destination: `${docsAppUrl}/docs/:path*`, source: "/docs/:path*" },
        { destination: `${dashboardAppUrl}/app`, source: "/app" },
        {
          destination: `${dashboardAppUrl}/app/:path*`,
          source: "/app/:path*",
        },
        {
          destination: `${dashboardAppUrl}/oauth/:path*`,
          source: "/oauth/:path*",
        },
        { destination: `${docsAppUrl}/api/:path*`, source: "/api/:path*" },
        { destination: `${docsAppUrl}/docs.json`, source: "/docs.json" },
        { destination: `${docsAppUrl}/sites/:path*`, source: "/sites/:path*" },
        {
          destination: `${docsAppUrl}/.well-known/:path*`,
          source: "/.well-known/:path*",
        },
        { destination: `${docsAppUrl}/llms.txt`, source: "/llms.txt" },
        {
          destination: `${docsAppUrl}/llms-full.txt`,
          source: "/llms-full.txt",
        },
        // Cross-project unprefixed /_next/* assets: when the browser requests
        // a chunk with a Referer from a proxied surface, forward it to the
        // matching backing app so the correct build serves it. Docs only needs
        // this in local development, where it runs without an asset prefix.
        {
          destination: `${docsAppUrl}/_next/:path*`,
          has: [
            {
              key: "referer",
              type: "header",
              value: ".*\\/docs(?:\\/.*)?(?:[?#].*)?$",
            },
          ],
          source: "/_next/:path*",
        },
        {
          destination: `${dashboardAppUrl}/_next/:path*`,
          has: [
            {
              key: "referer",
              type: "header",
              value: ".*\\/(app|oauth)(?:\\/.*)?(?:[?#].*)?$",
            },
          ],
          source: "/_next/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
