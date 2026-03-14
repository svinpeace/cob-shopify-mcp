import { describe, expect, it, vi } from "vitest";
import { listProductVariants } from "./list-product-variants.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("list_product_variants", () => {
	it("has correct tool definition", () => {
		expect(listProductVariants.name).toBe("list_product_variants");
		expect(listProductVariants.domain).toBe("products");
		expect(listProductVariants.tier).toBe(1);
		expect(listProductVariants.scopes).toEqual(["read_products"]);
	});

	it("passes product_id as id variable", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				product: {
					id: "gid://shopify/Product/1",
					title: "Test",
					variants: {
						edges: [{ node: { id: "v1", title: "Small", price: "10.00" } }],
						pageInfo: { hasNextPage: false, endCursor: null },
					},
				},
			},
		});

		const result = await listProductVariants.handler?.({ product_id: "gid://shopify/Product/1", limit: 25 }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			id: "gid://shopify/Product/1",
			first: 25,
		});
		expect(result.variants).toHaveLength(1);
		expect(result.productId).toBe("gid://shopify/Product/1");
	});

	it("handles product not found", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: { product: null },
		});

		const result = await listProductVariants.handler?.({ product_id: "gid://shopify/Product/999", limit: 25 }, mockCtx);

		expect(result.variants).toEqual([]);
	});
});
