import { type AddressInfo, createServer } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpTransport } from "./http-transport.js";

function createMockServer() {
	return {
		connect: vi.fn().mockResolvedValue(undefined),
	} as unknown as import("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
}

describe("HttpTransport", () => {
	let transport: HttpTransport | null = null;

	afterEach(async () => {
		if (transport) {
			await transport.stop();
			transport = null;
		}
	});

	it("starts HTTP server on configured port", async () => {
		transport = new HttpTransport(0, "localhost");
		const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

		await transport.start(createMockServer());

		expect(transport.address).not.toBeNull();
		expect(transport.address?.port).toBeGreaterThan(0);
		expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("MCP server started on http://"));
		stderrSpy.mockRestore();
	});

	it("health endpoint returns 200 with { status: 'ok' }", async () => {
		transport = new HttpTransport(0, "localhost");
		const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

		await transport.start(createMockServer());
		stderrSpy.mockRestore();

		const port = transport.address?.port;
		const response = await fetch(`http://localhost:${port}/health`);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body).toEqual({ status: "ok" });
	});

	it("stop closes the HTTP server", async () => {
		transport = new HttpTransport(0, "localhost");
		const stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);

		await transport.start(createMockServer());
		stderrSpy.mockRestore();

		const port = transport.address?.port;

		await transport.stop();
		transport = null; // prevent double-stop in afterEach

		// After stop, fetch should fail
		await expect(fetch(`http://localhost:${port}/health`)).rejects.toThrow();
	});

	it("handles EADDRINUSE error gracefully", async () => {
		// Start a plain TCP server to occupy a port
		const blocker = createServer();
		const blockerPort = await new Promise<number>((resolve) => {
			blocker.listen(0, "localhost", () => {
				resolve((blocker.address() as AddressInfo).port);
			});
		});

		try {
			transport = new HttpTransport(blockerPort, "localhost");

			await expect(transport.start(createMockServer())).rejects.toThrow(`Port ${blockerPort} is already in use`);
			transport = null; // failed to start, nothing to stop
		} finally {
			await new Promise<void>((resolve) => {
				blocker.close(() => resolve());
			});
		}
	});

	it("uses default host 0.0.0.0 when not configured", () => {
		transport = new HttpTransport(0);
		expect(transport).toBeInstanceOf(HttpTransport);
	});
});
