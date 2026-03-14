import { describe, expect, it, vi } from "vitest";
import { shopCurrenciesResource } from "./shop-currencies.resource.js";

describe("shopCurrenciesResource", () => {
	it("has correct metadata", () => {
		expect(shopCurrenciesResource.name).toBe("shop-currencies");
		expect(shopCurrenciesResource.uri).toBe("shopify://shop/{domain}/currencies");
		expect(shopCurrenciesResource.mimeType).toBe("application/json");
	});

	it("handler queries shopify and returns JSON", async () => {
		const mockData = {
			shop: {
				currencyCode: "USD",
				enabledPresentmentCurrencies: ["USD", "EUR", "GBP"],
			},
		};
		const ctx = {
			shopify: {
				query: vi.fn().mockResolvedValue({ data: mockData, cost: null }),
			},
		};

		const result = await shopCurrenciesResource.handler({ domain: "test.myshopify.com" }, ctx);

		expect(ctx.shopify.query).toHaveBeenCalled();
		expect(result.uri).toBe("shopify://shop/test.myshopify.com/currencies");
		expect(JSON.parse(result.text)).toEqual(mockData);
	});
});
