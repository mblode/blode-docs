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
  ".vercel",
  "next-env.d.ts",
]);
const EXCLUDE_FILENAMES = new Set([".gitignore", ".npmignore"]);
const isTestArtifact = (filename) =>
  filename.includes(".test.") || filename.includes(".spec.");

const createCopyFilter = (sourceRoot) => (source) => {
  const relative = path.relative(sourceRoot, source);
  if (!relative) {
    return true;
  }

  const topSegment = relative.split(path.sep)[0] ?? "";
  if (EXCLUDE_DIRS.has(topSegment) || topSegment.startsWith(".")) {
    return false;
  }

  const filename = path.basename(source);
  if (EXCLUDE_FILENAMES.has(filename)) {
    return false;
  }

  return !isTestArtifact(filename);
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
  {
    filter: createCopyFilter(path.join(repoRoot, "apps/dev-server")),
    recursive: true,
  }
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
    jsx: "react-jsx",
    lib: ["es2022", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleDetection: "force",
    moduleResolution: "Bundler",
    noEmit: true,
    noUncheckedIndexedAccess: true,
    paths: {
      "@/*": ["../docs/*"],
      "@dev/*": ["./*"],
      "@repo/*": ["../packages/@repo/*/src/index.ts"],
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
    ".next/dev/types/**/*.ts",
  ],
};
writeFileSync(
  path.join(cliRoot, "dev-server/tsconfig.json"),
  `${JSON.stringify(standaloneTsConfig, null, 2)}\n`
);

writeFileSync(
  path.join(cliRoot, "dev-server/next-env.d.ts"),
  [
    '/// <reference types="next" />',
    '/// <reference types="next/image-types/global" />',
    "",
    "// NOTE: This file should not be edited",
    "// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.",
    "",
  ].join("\n")
);

// 3. Copy shared docs code
console.log("Copying shared docs code...");

cpSync(
  path.join(repoRoot, "apps/docs/components"),
  path.join(cliRoot, "docs/components"),
  {
    filter: createCopyFilter(path.join(repoRoot, "apps/docs/components")),
    recursive: true,
  }
);

cpSync(path.join(repoRoot, "apps/docs/lib"), path.join(cliRoot, "docs/lib"), {
  filter: createCopyFilter(path.join(repoRoot, "apps/docs/lib")),
  recursive: true,
});

// Copy globals.css (imported by dev-server/app/globals.css)
mkdirSync(path.join(cliRoot, "docs/app"), { recursive: true });
cpSync(
  path.join(repoRoot, "apps/docs/app/globals.css"),
  path.join(cliRoot, "docs/app/globals.css")
);
cpSync(
  path.join(repoRoot, "apps/docs/app/favicon.ico"),
  path.join(cliRoot, "dev-server/app/favicon.ico")
);

// 4. Copy @repo packages (uses the same REPO_PACKAGES list as the build step)
console.log("Copying @repo packages...");

for (const pkg of REPO_PACKAGES) {
  const dest = path.join(cliRoot, `packages/@repo/${pkg}`);
  mkdirSync(dest, { recursive: true });
  cpSync(
    path.join(repoRoot, `packages/${pkg}/package.json`),
    path.join(dest, "package.json")
  );
  cpSync(path.join(repoRoot, `packages/${pkg}/dist`), path.join(dest, "dist"), {
    filter: createCopyFilter(path.join(repoRoot, `packages/${pkg}/dist`)),
    recursive: true,
  });
  cpSync(path.join(repoRoot, `packages/${pkg}/src`), path.join(dest, "src"), {
    filter: createCopyFilter(path.join(repoRoot, `packages/${pkg}/src`)),
    recursive: true,
  });
}

console.log("Done. Published package will include:");
console.log("  dev-server/  - Next.js dev server");
console.log("  docs/        - Shared docs components and lib");
console.log("  packages/    - @repo packages");
