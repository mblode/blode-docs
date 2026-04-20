const rawDocsAppUrl = (process.env.DOCS_APP_URL ?? "").trim();
const docsAppUrl = rawDocsAppUrl || "http://127.0.0.1:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  reactCompiler: true,
  rewrites() {
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
};

export default nextConfig;
