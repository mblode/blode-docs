import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    include: ["**/*.component.test.tsx"],
    passWithNoTests: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
