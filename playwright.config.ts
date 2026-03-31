import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:e2e --workspace=apps/docs",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: "http://localhost:3001",
  },
});
