import { defineConfig } from "tsup";

/** Node-only subpath; run after main tsup so `clean` does not wipe combined dist. */
export default defineConfig({
	entry: {
		"async-local": "src/async-local.ts",
	},
	format: ["esm", "cjs"],
	dts: {
		compilerOptions: {
			composite: false,
		},
	},
	splitting: false,
	sourcemap: true,
	clean: false,
	treeshake: true,
	minify: false,
	target: "es2022",
	platform: "node",
});
