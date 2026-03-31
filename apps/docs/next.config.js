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
