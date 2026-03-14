import type { CobConfig } from "@core/config/types.js";
import type { ToolEngine } from "@core/engine/tool-engine.js";
import type { ExecutionContext } from "@core/engine/types.js";
import type { ToolRegistry } from "@core/registry/tool-registry.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerTools(
	server: McpServer,
	registry: ToolRegistry,
	engine: ToolEngine,
	config: CobConfig,
	ctx: ExecutionContext,
): void {
	const enabledTools = registry.filter(config);
	for (const tool of enabledTools) {
		server.tool(tool.name, tool.description, tool.input, async (input, _extra) => {
			const result = await engine.execute(tool.name, input, ctx);
			return {
				content: [
					{
						type: "text" as const,
						text: JSON.stringify(result.data, null, 2),
					},
				],
				isError: false,
				_meta: {
					_cost: result._cost,
					_session: result._session,
				},
			};
		});
	}
}
