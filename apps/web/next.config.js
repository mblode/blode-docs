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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
    return [
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
  reactCompiler: true,
  rewrites() {
    return {
      beforeFiles: [
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
        // Cross-project /_next/* assets: when the browser requests a chunk
        // with a Referer from a proxied surface, forward it to the matching
        // backing app so the correct build serves it.
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
