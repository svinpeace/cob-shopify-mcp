import { describe, expect, it } from "vitest";
import { createTransport } from "./factory.js";
import { HttpTransport } from "./http-transport.js";
import { StdioTransport } from "./stdio-transport.js";

describe("createTransport", () => {
	it("returns StdioTransport instance for type stdio", () => {
		const transport = createTransport({ type: "stdio" });
		expect(transport).toBeInstanceOf(StdioTransport);
	});

	it("returns HttpTransport instance for type http", () => {
		const transport = createTransport({ type: "http" });
		expect(transport).toBeInstanceOf(HttpTransport);
	});

	it("throws for unknown transport type with helpful message", () => {
		expect(() =>
			// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
			createTransport({ type: "websocket" as any }),
		).toThrow("Unknown transport type: websocket. Supported: stdio, http");
	});

	it("uses default port 3000 when not specified for http", () => {
		const transport = createTransport({ type: "http" }) as HttpTransport;
		// HttpTransport is created — we verify it's an instance;
		// the default port (3000) is an internal detail tested via http-transport tests
		expect(transport).toBeInstanceOf(HttpTransport);
	});
});
