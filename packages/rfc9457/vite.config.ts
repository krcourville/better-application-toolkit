import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    platform: "neutral",
    sourcemap: true,
    target: "es2022",
    tsconfig: "./tsconfig.build.json",
  },
});
