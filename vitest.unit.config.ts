import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.unit.test.ts", "**/*.unit.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    passWithNoTests: false,
  },
});
