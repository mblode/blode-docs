import path from "node:path";
import { fileURLToPath } from "node:url";

const cleanEnv = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: cleanEnv(process.env.PLATFORM_ASSET_PREFIX),
  cacheLife: {
    artifacts: {
      expire: 3600,
      revalidate: 300,
      stale: 1800,
    },
    hours: {
      expire: 14_400,
      revalidate: 900,
      stale: 3600,
    },
  },
  experimental: {
    optimizePackageImports: [
      "blode-icons-react",
      "radix-ui",
      "@base-ui/react",
      "cmdk",
      "@repo/previewing",
      "@repo/models",
      "@repo/common",
    ],
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
    "/sites/**": ["./content/**/*"],
  },
  redirects() {
    return [
      {
        destination: "/oauth/consent",
        permanent: false,
        source: "/oauth/sign-up",
      },
      {
        destination: "/oauth/consent",
        permanent: false,
        source: "/oauth/sign-up/:path*",
      },
    ];
  },
  rewrites() {
    const assetPrefix = cleanEnv(process.env.PLATFORM_ASSET_PREFIX);
    const assetRewrite = assetPrefix
      ? [
          {
            destination: "/_next/:path*",
            source: `${assetPrefix}/_next/:path*`,
          },
        ]
      : [];
    return [
      ...assetRewrite,
      {
        destination: "/sites/:tenant/llms.mdx/:path*",
        source: "/sites/:tenant/:path*.md",
      },
      {
        destination: "/sites/:tenant/llms.mdx/:path*",
        source: "/sites/:tenant/:path*.mdx",
      },
    ];
  },
  transpilePackages: [
    "@repo/common",
    "@repo/contracts",
    "@repo/models",
    "@repo/prebuild",
    "@repo/previewing",
    "@repo/validation",
  ],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
