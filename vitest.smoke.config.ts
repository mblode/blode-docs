import { defineConfig } from "vitest/config";

export default defineConfig({
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
    include: ["**/*.smoke.test.ts", "**/*.smoke.test.tsx"],
    passWithNoTests: false,
  },
});
