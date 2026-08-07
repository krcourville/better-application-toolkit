import { defineConfig } from "vite-plus/test/config";
import { baseTestConfig } from "../vitest.config.base.js";

export default defineConfig({
  test: {
    ...baseTestConfig,
    passWithNoTests: true,
  },
});
