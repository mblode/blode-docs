const cleanEnv = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: cleanEnv(process.env.PLATFORM_ASSET_PREFIX),
  images: {
    remotePatterns: [
      {
        hostname: "**.public.blob.vercel-storage.com",
        protocol: "https",
      },
    ],
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
};

export default nextConfig;
