import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
    include: ["**/*.smoke.test.ts", "**/*.smoke.test.tsx"],
    passWithNoTests: false,
  },
});
