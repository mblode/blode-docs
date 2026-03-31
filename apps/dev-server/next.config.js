import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = process.env.BLODEMD_PACKAGES_DIR;
const turbopackRoot =
  process.env.BLODEMD_TURBOPACK_ROOT ||
  (packagesDir
    ? path.resolve(__dirname, "..")
    : path.resolve(__dirname, "../.."));

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
  turbopack: {
    // The dev server consumes sibling docs/ and workspace packages/
    // directories, so Turbopack needs a root that includes them.
    root: turbopackRoot,
  },
};

export default nextConfig;
