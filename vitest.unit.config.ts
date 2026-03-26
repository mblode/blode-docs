import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    include: ["**/*.unit.test.ts", "**/*.unit.test.tsx"],
    passWithNoTests: false,
  },
});
