import path from "node:path";

import { defineConfig } from "vitest/config";

const sharedExclude = [
  "**/node_modules/**",
  "**/.next/**",
  "**/dist/**",
  "apps/cli/dev-server/**",
  "apps/cli/docs/**",
  "apps/cli/packages/**",
];

const sharedAlias = {
  "@": path.resolve(import.meta.dirname, "apps/docs"),
};

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        oxc: { jsx: "react-jsx" },
        resolve: { alias: sharedAlias },
        test: {
          environment: "node",
          exclude: sharedExclude,
          include: ["**/*.unit.test.ts", "**/*.unit.test.tsx"],
          name: "unit",
        },
      },
      {
        extends: true,
        oxc: { jsx: "react-jsx" },
        resolve: { alias: sharedAlias },
        test: {
          environment: "jsdom",
          exclude: sharedExclude,
          include: ["**/*.component.test.tsx"],
          name: "component",
          passWithNoTests: true,
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          exclude: sharedExclude,
          include: ["**/*.int.test.ts", "**/*.int.test.tsx"],
          name: "integration",
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          exclude: sharedExclude,
          include: ["**/*.smoke.test.ts", "**/*.smoke.test.tsx"],
          name: "smoke",
        },
      },
    ],
  },
});
