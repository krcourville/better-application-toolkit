import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		index: "src/index.ts",
		console: "src/console.ts",
		"log-context": "src/log-context.ts",
	},
	format: ["esm", "cjs"],
	dts: {
		compilerOptions: {
			composite: false,
		},
	},
	splitting: false,
	sourcemap: true,
	// Keep false so `tsup --watch` does not delete `async-local.*` emitted by the other watcher.
	clean: false,
	treeshake: true,
	minify: false,
	target: "es2022",
	platform: "neutral",
	esbuildOptions(options) {
		// Keep dist/log-context.* as the single ALS module for all consumers.
		options.external ??= [];
		if (Array.isArray(options.external)) {
			options.external.push("./log-context.js", "./log-context.cjs");
		}
	},
});
