import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type TransportType = "stdio" | "http";

export interface TransportConfig {
	type: TransportType;
	httpPort?: number; // default 3000
	httpHost?: string; // default '0.0.0.0'
}

export interface TransportInstance {
	start(server: McpServer): Promise<void>;
	stop(): Promise<void>;
}
