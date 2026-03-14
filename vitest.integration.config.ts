import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import type { Plugin } from "vitest/config";
import { defineConfig } from "vitest/config";

config();

function graphqlRawPlugin(): Plugin {
	return {
		name: "graphql-raw",
		transform(_code: string, id: string) {
			if (id.endsWith(".graphql")) {
				const content = readFileSync(id, "utf-8");
				return { code: `export default ${JSON.stringify(content)};`, map: null };
			}
		},
	};
}

export default defineConfig({
	plugins: [graphqlRawPlugin()],
	test: {
		include: ["src/**/*.integration.test.ts"],
		testTimeout: 30000,
		hookTimeout: 30000,
		pool: "forks",
		singleFork: true,
	},
	resolve: {
		alias: [
			{ find: "@core", replacement: resolve(__dirname, "src/core") },
			{
				find: /^@shopify\/(?!admin-api-client|shopify-api|graphql-client)/,
				replacement: `${resolve(__dirname, "src/shopify")}/`,
			},
		],
	},
});
