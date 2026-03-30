/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
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
    unoptimized: true,
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
