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
    environment: "jsdom",
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "apps/cli/dev-server/**",
      "apps/cli/docs/**",
      "apps/cli/packages/**",
    ],
    include: ["**/*.component.test.tsx"],
    passWithNoTests: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
