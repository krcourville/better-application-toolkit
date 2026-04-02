import { defineConfig } from "vite-plus/test/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["**/*.test.ts", "**/*.spec.ts", "**/dist/**", "**/node_modules/**"],
    },
  },
});
