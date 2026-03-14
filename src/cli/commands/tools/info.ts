import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: { name: "info", description: "Show details for a specific tool" },
	args: {
		name: {
			type: "positional",
			description: "Tool name",
			required: true,
		},
	},
	async run({ args }) {
		const { getAllTools } = await import("../../../server/get-all-tools.js");

		const allTools = getAllTools();
		const tool = allTools.find((t) => t.name === args.name);

		if (!tool) {
			consola.error(`Tool "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		const lines: string[] = [
			`Name:        ${tool.name}`,
			`Domain:      ${tool.domain}`,
			`Tier:        ${tool.tier}`,
			`Description: ${tool.description}`,
			`Scopes:      ${tool.scopes.join(", ")}`,
			`Inputs:      ${Object.keys(tool.input).join(", ") || "(none)"}`,
		];

		if (tool.graphql) {
			lines.push(`GraphQL:     (defined)`);
		}

		process.stderr.write(`${lines.join("\n")}\n`);
	},
});
