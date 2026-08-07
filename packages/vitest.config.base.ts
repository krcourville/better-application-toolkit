import type { ViteUserConfig } from "vite-plus/test/config";

export const baseTestConfig: ViteUserConfig["test"] = {
  coverage: {
    exclude: ["**/*.test.ts", "**/*.spec.ts", "**/dist/**", "**/node_modules/**"],
    provider: "v8",
    reporter: ["text", "json", "html"],
  },
  environment: "node",
  globals: true,
};
