import type { PromptDefinition } from "@core/engine/prompt-types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer, prompts: PromptDefinition[]): void {
	for (const prompt of prompts) {
		const argsSchema: Record<string, ReturnType<typeof z.string>> = {};
		for (const arg of prompt.arguments) {
			argsSchema[arg.name] = arg.required
				? z.string().describe(arg.description)
				: (z.string().optional().describe(arg.description) as unknown as ReturnType<typeof z.string>);
		}

		server.prompt(prompt.name, prompt.description, argsSchema, async (args, _extra) => {
			const messages = await prompt.handler(args as Record<string, string>, undefined);
			return {
				messages: messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			};
		});
	}
}
