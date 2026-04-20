import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..", "..");

const rawDocsAppUrl = (process.env.DOCS_APP_URL ?? "").trim();
const isLocalUrl = /^https?:\/\/(?:localhost|127\.|0\.0\.0\.0|\[::1?\])/i.test(
  rawDocsAppUrl
);

// In production, a missing or localhost DOCS_APP_URL would cause Vercel to
// return DNS_HOSTNAME_RESOLVED_PRIVATE. Skip proxying entirely so those paths
// 404 cleanly instead.
const shouldProxy =
  rawDocsAppUrl.length > 0 && (process.env.VERCEL !== "1" || !isLocalUrl);

const docsAppUrl = rawDocsAppUrl || "http://127.0.0.1:3001";

if (process.env.VERCEL === "1" && !shouldProxy) {
  // eslint-disable-next-line no-console
  console.warn(
    "[apps/web] DOCS_APP_URL is unset or points at localhost; /docs, /app, " +
      "/oauth, /api, /sites proxying disabled for this build."
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["blode-icons-react", "radix-ui"],
  },
  images: {
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  rewrites() {
    if (!shouldProxy) {
      return { beforeFiles: [] };
    }
    return {
      beforeFiles: [
        { destination: `${docsAppUrl}/docs`, source: "/docs" },
        { destination: `${docsAppUrl}/docs/:path*`, source: "/docs/:path*" },
        { destination: `${docsAppUrl}/app`, source: "/app" },
        { destination: `${docsAppUrl}/app/:path*`, source: "/app/:path*" },
        { destination: `${docsAppUrl}/oauth/:path*`, source: "/oauth/:path*" },
        { destination: `${docsAppUrl}/api/:path*`, source: "/api/:path*" },
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
      ],
    };
  },
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
