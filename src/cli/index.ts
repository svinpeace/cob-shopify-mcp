#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { VERSION } from "../index.js";

process.on("unhandledRejection", (reason) => {
	const message = reason instanceof Error ? reason.message : String(reason);
	consola.error(`Unhandled error: ${message}`);
	process.exit(1);
});

const main = defineCommand({
	meta: {
		name: "cob-shopify-mcp",
		version: VERSION,
		description: "Shopify MCP Server",
	},
	subCommands: {
		start: () => import("./commands/start.js").then((m) => m.default),
		connect: () => import("./commands/connect.js").then((m) => m.default),
		config: () => import("./commands/config/index.js").then((m) => m.default),
		tools: () => import("./commands/tools/index.js").then((m) => m.default),
		stores: () => import("./commands/stores/index.js").then((m) => m.default),
	},
});

runMain(main);
