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
    include: ["**/*.int.test.ts", "**/*.int.test.tsx"],
    passWithNoTests: false,
  },
});
