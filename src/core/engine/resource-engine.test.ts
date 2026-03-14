import { describe, expect, it, vi } from "vitest";
import { ResourceEngine } from "./resource-engine.js";
import type { ResourceDefinition } from "./resource-types.js";

function makeResource(overrides?: Partial<ResourceDefinition>): ResourceDefinition {
	return {
		uri: "shopify://shop/{domain}/info",
		name: "Shop Info",
		description: "Basic shop information",
		mimeType: "application/json",
		handler: async (params) => ({
			uri: `shopify://shop/${params.domain}/info`,
			mimeType: "application/json",
			text: JSON.stringify({ domain: params.domain }),
		}),
		...overrides,
	};
}

describe("ResourceEngine", () => {
	it("register + list roundtrip", () => {
		const engine = new ResourceEngine();
		const resource = makeResource();
		engine.register(resource);
		const list = engine.list();
		expect(list).toHaveLength(1);
		expect(list[0].uri).toBe(resource.uri);
	});

	it("read extracts URI params correctly", async () => {
		const engine = new ResourceEngine();
		const handler = vi.fn(async (params: Record<string, string>) => ({
			uri: `shopify://shop/${params.domain}/info`,
			mimeType: "application/json",
			text: "{}",
		}));
		engine.register(makeResource({ handler }));

		await engine.read("shopify://shop/test.myshopify.com/info", {});
		expect(handler).toHaveBeenCalledWith({ domain: "test.myshopify.com" }, {});
	});

	it("read calls handler with extracted params", async () => {
		const engine = new ResourceEngine();
		const handler = vi.fn(async () => ({
			uri: "shopify://shop/x/info",
			mimeType: "application/json",
			text: "{}",
		}));
		engine.register(makeResource({ handler }));

		await engine.read("shopify://shop/my-store.myshopify.com/info", {});
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0]).toEqual({
			domain: "my-store.myshopify.com",
		});
	});

	it("read throws for URI that matches no registered resource", async () => {
		const engine = new ResourceEngine();
		engine.register(makeResource());
		await expect(engine.read("shopify://shop/test/unknown/path", {})).rejects.toThrow("No resource matches URI");
	});

	it("read returns ResourceContent from handler", async () => {
		const engine = new ResourceEngine();
		engine.register(makeResource());

		const result = await engine.read("shopify://shop/test.myshopify.com/info", {});
		expect(result.uri).toBe("shopify://shop/test.myshopify.com/info");
		expect(result.mimeType).toBe("application/json");
		expect(result.text).toBe(JSON.stringify({ domain: "test.myshopify.com" }));
	});
});
