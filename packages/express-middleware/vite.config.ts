import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    fixedExtension: false,
    format: ["esm", "cjs"],
    platform: "node",
    sourcemap: true,
    target: "es2022",
    tsconfig: "./tsconfig.build.json",
  },
});
