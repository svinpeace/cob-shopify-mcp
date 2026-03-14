import { describe, expect, it } from "vitest";
import { getProductVariant } from "./get-product-variant.tool.js";

describe("get_product_variant", () => {
	it("has correct tool definition", () => {
		expect(getProductVariant.name).toBe("get_product_variant");
		expect(getProductVariant.domain).toBe("products");
		expect(getProductVariant.tier).toBe(1);
		expect(getProductVariant.scopes).toEqual(["read_products"]);
		expect(getProductVariant.graphql).toBeTruthy();
	});

	it("response mapper returns variant", () => {
		const data = {
			productVariant: {
				id: "gid://shopify/ProductVariant/1",
				title: "Small",
				price: "29.99",
				sku: "H-SM",
			},
		};

		const result = getProductVariant.response?.(data);
		expect(result.variant.id).toBe("gid://shopify/ProductVariant/1");
		expect(result.variant.price).toBe("29.99");
	});

	it("response mapper handles null variant", () => {
		const result = getProductVariant.response?.({ productVariant: null });
		expect(result.variant).toBeNull();
	});
});
