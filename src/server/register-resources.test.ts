import type { ResourceDefinition } from "@core/engine/resource-types.js";
import type { ExecutionContext } from "@core/engine/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerResources } from "./register-resources.js";

function createMockServer() {
	return {
		tool: vi.fn(),
		resource: vi.fn(),
		prompt: vi.fn(),
	};
}

function createMockCtx(): ExecutionContext {
	return {
		shopify: {
			query: vi.fn().mockResolvedValue({
				data: { shop: { name: "Test Shop" } },
				cost: null,
			}),
		},
		config: {} as any,
		storage: {} as any,
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any,
		costTracker: { recordCall: vi.fn() } as any,
	};
}

describe("registerResources", () => {
	let mockServer: ReturnType<typeof createMockServer>;
	let ctx: ExecutionContext;

	beforeEach(() => {
		mockServer = createMockServer();
		ctx = createMockCtx();
	});

	it("registers all resources with McpServer.resource()", () => {
		const resources: ResourceDefinition[] = [
			{
				uri: "shopify://shop/{domain}/info",
				name: "shop-info",
				description: "Shop info",
				mimeType: "application/json",
				handler: vi.fn().mockResolvedValue({
					uri: "shopify://shop/test.myshopify.com/info",
					mimeType: "application/json",
					text: "{}",
				}),
			},
			{
				uri: "shopify://shop/{domain}/locations",
				name: "shop-locations",
				description: "Shop locations",
				mimeType: "application/json",
				handler: vi.fn().mockResolvedValue({
					uri: "shopify://shop/test.myshopify.com/locations",
					mimeType: "application/json",
					text: "{}",
				}),
			},
		];

		registerResources(mockServer as any, resources, ctx);

		expect(mockServer.resource).toHaveBeenCalledTimes(2);
		expect(mockServer.resource.mock.calls[0][0]).toBe("shop-info");
		expect(mockServer.resource.mock.calls[1][0]).toBe("shop-locations");
	});

	it("resource handler calls resource definition handler with ctx", async () => {
		const handlerFn = vi.fn().mockResolvedValue({
			uri: "shopify://shop/test.myshopify.com/info",
			mimeType: "application/json",
			text: '{"shop":{"name":"Test"}}',
		});

		const resources: ResourceDefinition[] = [
			{
				uri: "shopify://shop/{domain}/info",
				name: "shop-info",
				description: "Shop info",
				mimeType: "application/json",
				handler: handlerFn,
			},
		];

		registerResources(mockServer as any, resources, ctx);

		// Extract the callback (3rd argument)
		const callback = mockServer.resource.mock.calls[0][2];
		const uri = new URL("shopify://shop/test.myshopify.com/info");
		const result = await callback(uri, { domain: "test.myshopify.com" });

		expect(handlerFn).toHaveBeenCalledWith({ domain: "test.myshopify.com" }, ctx);
		expect(result.contents).toHaveLength(1);
		expect(result.contents[0].mimeType).toBe("application/json");
	});
});
