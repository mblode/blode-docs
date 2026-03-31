import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: "react-jsx",
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/docs"),
    },
  },
  test: {
    environment: "node",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "apps/cli/dev-server/**",
      "apps/cli/docs/**",
      "apps/cli/packages/**",
    ],
    include: ["**/*.unit.test.ts", "**/*.unit.test.tsx"],
    passWithNoTests: false,
  },
});
