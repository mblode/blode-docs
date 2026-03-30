#!/usr/bin/env node

/**
 * Assembles the dev-server, shared docs code, and @repo packages
 * into the CLI package directory for npm publishing.
 *
 * Run: node scripts/prepare-dist.mjs
 */

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(cliRoot, "../..");

// 0. Build @repo packages so dist/ is available for all of them
console.log("Building @repo packages...");
const REPO_PACKAGES = [
  "common",
  "contracts",
  "models",
  "prebuild",
  "previewing",
  "validation",
];
for (const pkg of REPO_PACKAGES) {
  execSync("npm run build", {
    cwd: path.join(repoRoot, `packages/${pkg}`),
    stdio: "inherit",
  });
}

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "next-env.d.ts",
]);

const devServerFilter = (src) => {
  const rel = path.relative(path.join(repoRoot, "apps/dev-server"), src);
  const topSegment = rel.split(path.sep)[0];
  return !EXCLUDE_DIRS.has(topSegment);
};

// Clean previous artifacts
for (const dir of ["dev-server", "docs", "packages"]) {
  rmSync(path.join(cliRoot, dir), { force: true, recursive: true });
}

// 1. Copy dev-server
console.log("Copying dev-server...");
cpSync(
  path.join(repoRoot, "apps/dev-server"),
  path.join(cliRoot, "dev-server"),
  { filter: devServerFilter, recursive: true }
);

// 2. Generate standalone tsconfig.json (inlines @repo/typescript-config)
console.log("Writing standalone tsconfig.json...");
const standaloneTsConfig = {
  compilerOptions: {
    allowJs: true,
    declaration: true,
    declarationMap: true,
    esModuleInterop: true,
    incremental: false,
    isolatedModules: true,
    jsx: "preserve",
    lib: ["es2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleDetection: "force",
    moduleResolution: "Bundler",
    noEmit: true,
    noUncheckedIndexedAccess: true,
    paths: {
      "@/*": ["../docs/*"],
      "@dev/*": ["./*"],
    },
    plugins: [{ name: "next" }],
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: true,
    strictNullChecks: true,
    target: "ES2022",
  },
  exclude: ["node_modules"],
  include: [
    "**/*.ts",
    "**/*.tsx",
    "next-env.d.ts",
    "next.config.js",
    ".next/types/**/*.ts",
  ],
};
writeFileSync(
  path.join(cliRoot, "dev-server/tsconfig.json"),
  JSON.stringify(standaloneTsConfig, null, 2) + "\n"
);

// 3. Copy shared docs code
console.log("Copying shared docs code...");

const DOCS_COMPONENT_DIRS = ["api", "content", "docs", "mdx", "ui"];
for (const comp of DOCS_COMPONENT_DIRS) {
  cpSync(
    path.join(repoRoot, `apps/docs/components/${comp}`),
    path.join(cliRoot, `docs/components/${comp}`),
    { recursive: true }
  );
}

// Copy providers.tsx (used by dev-server layout)
cpSync(
  path.join(repoRoot, "apps/docs/components/providers.tsx"),
  path.join(cliRoot, "docs/components/providers.tsx")
);

const DOCS_LIB_FILES = [
  "contextual-options.ts",
  "docs-collection.ts",
  "mdx.ts",
  "navigation.ts",
  "openapi.ts",
  "routes.ts",
  "server-cache.ts",
  "shiki.ts",
  "theme.ts",
  "toc.ts",
  "utils.ts",
];
mkdirSync(path.join(cliRoot, "docs/lib"), { recursive: true });
for (const lib of DOCS_LIB_FILES) {
  cpSync(
    path.join(repoRoot, `apps/docs/lib/${lib}`),
    path.join(cliRoot, `docs/lib/${lib}`)
  );
}

// Copy globals.css (imported by dev-server/app/globals.css)
mkdirSync(path.join(cliRoot, "docs/app"), { recursive: true });
cpSync(
  path.join(repoRoot, "apps/docs/app/globals.css"),
  path.join(cliRoot, "docs/app/globals.css")
);

// 4. Copy @repo packages
console.log("Copying @repo packages...");

const COMPILED_PACKAGES = [
  "common",
  "contracts",
  "models",
  "previewing",
  "validation",
];
for (const pkg of COMPILED_PACKAGES) {
  const dest = path.join(cliRoot, `packages/@repo/${pkg}`);
  mkdirSync(dest, { recursive: true });
  cpSync(
    path.join(repoRoot, `packages/${pkg}/package.json`),
    path.join(dest, "package.json")
  );
  cpSync(path.join(repoRoot, `packages/${pkg}/dist`), path.join(dest, "dist"), {
    recursive: true,
  });
  // Also copy src/ for packages that export types from source
  cpSync(path.join(repoRoot, `packages/${pkg}/src`), path.join(dest, "src"), {
    recursive: true,
  });
}

// prebuild: has both src/ (raw TypeScript for transpilePackages) and dist/ (built above)
const prebuildDest = path.join(cliRoot, "packages/@repo/prebuild");
mkdirSync(prebuildDest, { recursive: true });
cpSync(
  path.join(repoRoot, "packages/prebuild/package.json"),
  path.join(prebuildDest, "package.json")
);
cpSync(
  path.join(repoRoot, "packages/prebuild/dist"),
  path.join(prebuildDest, "dist"),
  { recursive: true }
);
cpSync(
  path.join(repoRoot, "packages/prebuild/src"),
  path.join(prebuildDest, "src"),
  { recursive: true }
);

console.log("Done. Published package will include:");
console.log("  dev-server/  - Next.js dev server");
console.log("  docs/        - Shared docs components and lib");
console.log("  packages/    - @repo packages");
