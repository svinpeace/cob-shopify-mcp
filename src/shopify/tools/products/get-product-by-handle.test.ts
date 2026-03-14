import { describe, expect, it } from "vitest";
import { getProductByHandle } from "./get-product-by-handle.tool.js";

describe("get_product_by_handle", () => {
	it("has correct tool definition", () => {
		expect(getProductByHandle.name).toBe("get_product_by_handle");
		expect(getProductByHandle.domain).toBe("products");
		expect(getProductByHandle.tier).toBe(1);
		expect(getProductByHandle.scopes).toEqual(["read_products"]);
		expect(getProductByHandle.graphql).toBeTruthy();
	});

	it("response mapper flattens product data", () => {
		const data = {
			productByIdentifier: {
				id: "gid://shopify/Product/1",
				title: "Test",
				handle: "test",
				media: { edges: [{ node: { id: "img1", url: "https://example.com/img.jpg" } }] },
				variants: { edges: [{ node: { id: "v1", title: "Default", price: "10.00" } }] },
			},
		};

		const result = getProductByHandle.response?.(data);
		expect(result.product.handle).toBe("test");
		expect(result.product.media).toHaveLength(1);
		expect(result.product.variants).toHaveLength(1);
	});

	it("response mapper handles null product", () => {
		const result = getProductByHandle.response?.({ productByIdentifier: null });
		expect(result.product).toBeNull();
	});
});
