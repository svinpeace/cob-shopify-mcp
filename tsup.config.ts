import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/cli/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	target: "node22",
	outDir: "dist",
	splitting: false,
	loader: {
		".graphql": "text",
	},
});
