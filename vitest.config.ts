import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    projects: ["packages/*/vitest.config.ts"],
  },
});
