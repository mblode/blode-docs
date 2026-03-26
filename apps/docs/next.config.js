/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: process.env.PLATFORM_ASSET_PREFIX || "",
  images: {
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
  },
  rewrites() {
    const assetPrefix = process.env.PLATFORM_ASSET_PREFIX || "";
    if (!assetPrefix) {
      return [];
    }
    return [
      {
        destination: "/_next/:path*",
        source: `${assetPrefix}/_next/:path*`,
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
};

export default nextConfig;
