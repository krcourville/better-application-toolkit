import { defineConfig } from "tsup";

/** Node-only subpath; run after main tsup so `clean` does not wipe combined dist. */
export default defineConfig({
  clean: false,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  entry: {
    "async-local": "src/async-local.ts",
  },
  esbuildOptions(options) {
    // Share one ALS instance with dist/log-context.{js,cjs} from the main tsup build.
    options.external ??= [];
    if (Array.isArray(options.external)) {
      options.external.push("./log-context.js", "./log-context.cjs");
    }
  },
  format: ["esm", "cjs"],
  minify: false,
  platform: "node",
  sourcemap: true,
  splitting: false,
  target: "es2022",
  treeshake: true,
});
