import { describe, expect, it } from "vitest";
import { getProduct } from "./get-product.tool.js";

describe("get_product", () => {
	it("has correct tool definition", () => {
		expect(getProduct.name).toBe("get_product");
		expect(getProduct.domain).toBe("products");
		expect(getProduct.tier).toBe(1);
		expect(getProduct.scopes).toEqual(["read_products"]);
		expect(getProduct.graphql).toBeTruthy();
	});

	it("response mapper flattens product data", () => {
		const data = {
			product: {
				id: "gid://shopify/Product/1",
				title: "Test",
				media: { edges: [{ node: { id: "img1", url: "https://example.com/img.jpg" } }] },
				variants: { edges: [{ node: { id: "v1", title: "Default", price: "10.00" } }] },
			},
		};

		const result = getProduct.response?.(data);
		expect(result.product.media).toEqual([{ id: "img1", url: "https://example.com/img.jpg" }]);
		expect(result.product.variants).toEqual([{ id: "v1", title: "Default", price: "10.00" }]);
	});

	it("response mapper handles null product", () => {
		const result = getProduct.response?.({ product: null });
		expect(result.product).toBeNull();
	});

	it("response mapper handles missing media/variants", () => {
		const data = { product: { id: "gid://shopify/Product/1", title: "Bare" } };
		const result = getProduct.response?.(data);
		expect(result.product.media).toEqual([]);
		expect(result.product.variants).toEqual([]);
	});
});
