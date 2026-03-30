import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  entry: { index: "src/index.ts" },
  format: ["esm"],
  sourcemap: true,
  target: "node22",
});
