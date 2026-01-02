import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.int.test.ts", "**/*.int.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    passWithNoTests: false,
  },
});
