import type { ResourceDefinition } from "@core/engine/resource-types.js";
import type { ExecutionContext } from "@core/engine/types.js";
import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer, resources: ResourceDefinition[], ctx: ExecutionContext): void {
	for (const resource of resources) {
		const template = new ResourceTemplate(resource.uri, { list: undefined });
		server.resource(resource.name, template, async (uri, variables, _extra) => {
			const result = await resource.handler(variables as Record<string, string>, ctx);
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: resource.mimeType,
						text: result.text,
					},
				],
			};
		});
	}
}
