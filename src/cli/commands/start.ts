import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: { name: "start", description: "Start the MCP server" },
	args: {
		transport: {
			type: "string",
			description: "Transport type (stdio or http)",
			default: "stdio",
		},
		port: {
			type: "string",
			description: "HTTP port (only for http transport)",
			default: "3000",
		},
		host: {
			type: "string",
			description: "HTTP host to bind (only for http transport)",
			default: "localhost",
		},
		"read-only": {
			type: "boolean",
			description: "Enable read-only mode (disable all mutations)",
		},
		config: {
			type: "string",
			description: "Path to config file",
		},
		"log-level": {
			type: "string",
			description: "Log level (debug, info, warn, error)",
		},
	},
	async run({ args }) {
		try {
			const { bootstrap } = await import("../../server/bootstrap.js");

			const overrides: Record<string, unknown> = {};

			if (args.transport) {
				overrides.transport = { type: args.transport };
			}
			if (args.port) {
				overrides.transport = {
					...(overrides.transport as Record<string, unknown>),
					port: Number.parseInt(args.port, 10),
				};
			}
			if (args.host) {
				overrides.transport = {
					...(overrides.transport as Record<string, unknown>),
					host: args.host,
				};
			}
			if (args["read-only"]) {
				overrides.tools = { read_only: true };
			}
			if (args["log-level"]) {
				overrides.observability = { log_level: args["log-level"] };
			}

			await bootstrap(overrides);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			consola.error(`Failed to start server: ${message}`);
			process.exit(1);
		}
	},
});
