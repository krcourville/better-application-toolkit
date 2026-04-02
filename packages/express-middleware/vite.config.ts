import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    tsconfig: "./tsconfig.build.json",
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    platform: "node",
    target: "es2022",
    fixedExtension: false,
  },
});
