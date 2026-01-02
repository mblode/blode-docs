import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "apps/web"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.component.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    passWithNoTests: false,
  },
});
