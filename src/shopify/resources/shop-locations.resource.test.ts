import { describe, expect, it, vi } from "vitest";
import { shopLocationsResource } from "./shop-locations.resource.js";

describe("shopLocationsResource", () => {
	it("has correct metadata", () => {
		expect(shopLocationsResource.name).toBe("shop-locations");
		expect(shopLocationsResource.uri).toBe("shopify://shop/{domain}/locations");
		expect(shopLocationsResource.mimeType).toBe("application/json");
	});

	it("handler queries shopify and returns JSON", async () => {
		const mockData = {
			locations: { nodes: [{ id: "gid://shopify/Location/1", name: "Main" }] },
		};
		const ctx = {
			shopify: {
				query: vi.fn().mockResolvedValue({ data: mockData, cost: null }),
			},
		};

		const result = await shopLocationsResource.handler({ domain: "test.myshopify.com" }, ctx);

		expect(ctx.shopify.query).toHaveBeenCalled();
		expect(result.uri).toBe("shopify://shop/test.myshopify.com/locations");
		expect(JSON.parse(result.text)).toEqual(mockData);
	});
});
