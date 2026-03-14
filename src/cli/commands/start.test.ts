import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBootstrap = vi.fn().mockResolvedValue(undefined);

vi.mock("../../server/bootstrap.js", () => ({
	bootstrap: mockBootstrap,
}));

describe("start command", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls bootstrap with default overrides", async () => {
		const { default: startCmd } = await import("./start.js");

		await startCmd.run?.({
			args: {
				transport: "stdio",
				port: "3000",
				"read-only": false,
				config: undefined,
				"log-level": undefined,
			},
			rawArgs: [],
			cmd: startCmd,
		} as any);

		expect(mockBootstrap).toHaveBeenCalledOnce();
		const overrides = mockBootstrap.mock.calls[0][0];
		expect(overrides.transport).toEqual({ type: "stdio", port: 3000 });
	});

	it("maps --read-only to tools.read_only override", async () => {
		const { default: startCmd } = await import("./start.js");

		await startCmd.run?.({
			args: {
				transport: "stdio",
				port: "3000",
				"read-only": true,
				config: undefined,
				"log-level": undefined,
			},
			rawArgs: [],
			cmd: startCmd,
		} as any);

		const overrides = mockBootstrap.mock.calls[0][0];
		expect(overrides.tools).toEqual({ read_only: true });
	});

	it("maps --log-level to observability override", async () => {
		const { default: startCmd } = await import("./start.js");

		await startCmd.run?.({
			args: {
				transport: "http",
				port: "8080",
				"read-only": false,
				config: undefined,
				"log-level": "debug",
			},
			rawArgs: [],
			cmd: startCmd,
		} as any);

		const overrides = mockBootstrap.mock.calls[0][0];
		expect(overrides.observability).toEqual({ log_level: "debug" });
		expect(overrides.transport).toEqual({ type: "http", port: 8080 });
	});
});
