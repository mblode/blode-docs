import path from "node:path";

// When running in standalone mode (npm-installed CLI), the CLI sets this
// to the directory containing shipped @repo packages.
const packagesDir = process.env.BLODEMD_PACKAGES_DIR;

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
  webpack: (config) => {
    if (packagesDir) {
      // In standalone mode, @repo packages live in the CLI's packages/ dir.
      // Add it as a module resolution root so webpack (and transpilePackages)
      // can resolve @repo/common from packages/@repo/common/.
      config.resolve.modules = [
        path.resolve(packagesDir),
        ...(config.resolve.modules || []),
      ];
    }
    return config;
  },
};

export default nextConfig;
