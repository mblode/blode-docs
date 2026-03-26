import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    include: ["**/*.int.test.ts", "**/*.int.test.tsx"],
    passWithNoTests: false,
  },
});
