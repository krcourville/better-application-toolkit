import { defineConfig } from "tsup";

export default defineConfig({
  // Keep false so `tsup --watch` does not delete `async-local.*` emitted by the other watcher.
  clean: false,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  entry: {
    console: "src/console.ts",
    index: "src/index.ts",
    "log-context": "src/log-context.ts",
  },
  esbuildOptions(options) {
    // Keep dist/log-context.* as the single ALS module for all consumers.
    options.external ??= [];
    if (Array.isArray(options.external)) {
      options.external.push("./log-context.js", "./log-context.cjs");
    }
  },
  format: ["esm", "cjs"],
  minify: false,
  platform: "neutral",
  sourcemap: true,
  splitting: false,
  target: "es2022",
  treeshake: true,
});
