import { HttpTransport } from "./http-transport.js";
import { StdioTransport } from "./stdio-transport.js";
import type { TransportConfig, TransportInstance } from "./types.js";

export function createTransport(config: TransportConfig): TransportInstance {
	switch (config.type) {
		case "stdio":
			return new StdioTransport();
		case "http":
			return new HttpTransport(config.httpPort, config.httpHost);
		default:
			throw new Error(`Unknown transport type: ${config.type}. Supported: stdio, http`);
	}
}
