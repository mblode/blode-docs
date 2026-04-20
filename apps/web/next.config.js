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

// /docs and /app render HTML that references `/_next/...` assets relative to the
// apps/docs origin. Proxying those URLs through apps/web would need apps/web to
// forward /_next/* back to apps/docs, which collides with apps/web's own asset
// paths. Redirect the browser to docs.blode.md (apps/docs's public origin) so
// asset URLs resolve on the correct origin.
const redirectPaths = [
  { source: "/docs", suffix: "" },
  { source: "/docs/:path*", suffix: "/:path*" },
  { source: "/app", suffix: "" },
  { source: "/app/:path*", suffix: "/:path*" },
  { source: "/oauth/:path*", suffix: "/:path*" },
];

// Server-to-server proxy is still fine for machine-readable endpoints where the
// browser never sees the URL (no asset loading, no hydration).
const proxyRules = [
  { destination: `${docsAppUrl}/api/:path*`, source: "/api/:path*" },
  { destination: `${docsAppUrl}/sites/:path*`, source: "/sites/:path*" },
  {
    destination: `${docsAppUrl}/.well-known/:path*`,
    source: "/.well-known/:path*",
  },
  { destination: `${docsAppUrl}/llms.txt`, source: "/llms.txt" },
  { destination: `${docsAppUrl}/llms-full.txt`, source: "/llms-full.txt" },
];

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
  redirects() {
    if (!shouldProxy) {
      return [];
    }
    return redirectPaths.map(({ source, suffix }) => ({
      destination: `${docsAppUrl}${source.replace(/\/:path\*$/, "")}${suffix}`,
      permanent: false,
      source,
    }));
  },
  rewrites() {
    if (!shouldProxy) {
      return { beforeFiles: [] };
    }
    return { beforeFiles: proxyRules };
  },
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
