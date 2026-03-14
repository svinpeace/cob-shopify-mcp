import { describe, expect, it } from "vitest";

describe("cob-shopify-mcp scaffold", () => {
	it("exports package entry point", async () => {
		const mod = await import("./index.js");
		expect(mod).toBeDefined();
		expect(mod.VERSION).toBe("0.1.0");
	});
});
