import { describe, expect, it, vi } from "vitest";
import { shopInfoResource } from "./shop-info.resource.js";

describe("shopInfoResource", () => {
	it("has correct metadata", () => {
		expect(shopInfoResource.name).toBe("shop-info");
		expect(shopInfoResource.uri).toBe("shopify://shop/{domain}/info");
		expect(shopInfoResource.mimeType).toBe("application/json");
	});

	it("handler queries shopify and returns JSON", async () => {
		const mockData = { shop: { name: "Test Store", email: "test@example.com" } };
		const ctx = {
			shopify: {
				query: vi.fn().mockResolvedValue({ data: mockData, cost: null }),
			},
		};

		const result = await shopInfoResource.handler({ domain: "test.myshopify.com" }, ctx);

		expect(ctx.shopify.query).toHaveBeenCalled();
		expect(result.uri).toBe("shopify://shop/test.myshopify.com/info");
		expect(result.mimeType).toBe("application/json");
		expect(JSON.parse(result.text)).toEqual(mockData);
	});
});
