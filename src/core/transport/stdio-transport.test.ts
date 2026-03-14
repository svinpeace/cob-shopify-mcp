import { describe, expect, it, vi } from "vitest";
import { StdioTransport } from "./stdio-transport.js";

describe("StdioTransport", () => {
	it("creates transport instance", () => {
		const transport = new StdioTransport();
		expect(transport).toBeInstanceOf(StdioTransport);
	});

	it("start connects to McpServer", async () => {
		const transport = new StdioTransport();
		const mockServer = {
			connect: vi.fn().mockResolvedValue(undefined),
		};
		const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

		await transport.start(mockServer as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer);

		expect(mockServer.connect).toHaveBeenCalledOnce();
		expect(stderrSpy).toHaveBeenCalledWith("MCP server started on stdio\n");

		stderrSpy.mockRestore();
	});

	it("stop is safe to call without starting", async () => {
		const transport = new StdioTransport();
		// Should not throw
		await transport.stop();
	});
});
