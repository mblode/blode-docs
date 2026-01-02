import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.smoke.test.ts", "**/*.smoke.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    passWithNoTests: false,
  },
});
