import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = process.env.BLODEMD_PACKAGES_DIR;
const isStandalone = Boolean(packagesDir);
const turbopackRoot =
  process.env.BLODEMD_TURBOPACK_ROOT ||
  (isStandalone
    ? path.resolve(__dirname, "..")
    : path.resolve(__dirname, "../.."));

// In monorepo mode we transpile @repo/* from source so edits to the
// package src/ files hot-reload. In standalone mode the @repo packages
// ship pre-built `dist/` via their package.json `exports`; transpiling
// their `src/` would make Turbopack miss the `.js` → `.ts` resolution
// for same-package imports, so we let Next consume the compiled output.
const repoTranspilePackages = isStandalone
  ? []
  : [
      "@repo/common",
      "@repo/contracts",
      "@repo/models",
      "@repo/prebuild",
      "@repo/previewing",
      "@repo/validation",
    ];

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
  transpilePackages: repoTranspilePackages,
  turbopack: {
    // The dev server consumes sibling docs/ and workspace packages/
    // directories, so Turbopack needs a root that includes them.
    root: turbopackRoot,
  },
};

export default nextConfig;
