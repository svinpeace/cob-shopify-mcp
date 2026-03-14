import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { TransportInstance } from "./types.js";

export class StdioTransport implements TransportInstance {
	private transport: StdioServerTransport | null = null;

	async start(server: McpServer): Promise<void> {
		this.transport = new StdioServerTransport();
		await server.connect(this.transport);
		process.stderr.write("MCP server started on stdio\n");
	}

	async stop(): Promise<void> {
		if (this.transport) {
			await this.transport.close();
		}
	}
}
