import { describe, expect, it, vi } from "vitest";
import { shopPoliciesResource } from "./shop-policies.resource.js";

describe("shopPoliciesResource", () => {
	it("has correct metadata", () => {
		expect(shopPoliciesResource.name).toBe("shop-policies");
		expect(shopPoliciesResource.uri).toBe("shopify://shop/{domain}/policies");
		expect(shopPoliciesResource.mimeType).toBe("application/json");
	});

	it("handler queries shopify and returns JSON", async () => {
		const mockData = {
			shop: {
				shopPolicies: [
					{ title: "Privacy", body: "...", type: "PRIVACY_POLICY" },
					{ title: "Refund", body: "...", type: "REFUND_POLICY" },
					{ title: "TOS", body: "...", type: "TERMS_OF_SERVICE" },
				],
			},
		};
		const ctx = {
			shopify: {
				query: vi.fn().mockResolvedValue({ data: mockData, cost: null }),
			},
		};

		const result = await shopPoliciesResource.handler({ domain: "test.myshopify.com" }, ctx);

		expect(ctx.shopify.query).toHaveBeenCalled();
		expect(result.uri).toBe("shopify://shop/test.myshopify.com/policies");
		expect(JSON.parse(result.text)).toEqual(mockData);
	});
});
