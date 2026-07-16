import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/dist/**", "**/node_modules/**"],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    globals: true,
  },
});
