import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
  lint: {
    rules: {
      "no-template-curly-in-string": "error",
    },
  },
});
