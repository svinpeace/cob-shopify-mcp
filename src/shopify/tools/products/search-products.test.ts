import { describe, expect, it, vi } from "vitest";
import { searchProducts } from "./search-products.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("search_products", () => {
	it("has correct tool definition", () => {
		expect(searchProducts.name).toBe("search_products");
		expect(searchProducts.domain).toBe("products");
		expect(searchProducts.tier).toBe(1);
		expect(searchProducts.scopes).toEqual(["read_products"]);
	});

	it("passes query string to shopify.query", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: {
					edges: [{ node: { id: "1", title: "Hoodie", variants: { edges: [] } } }],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		const result = await searchProducts.handler?.({ query: "hoodie", limit: 10 }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 10, query: "hoodie" });
		expect(result.products).toHaveLength(1);
	});

	it("passes cursor for pagination", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		await searchProducts.handler?.({ query: "shirt", limit: 5, cursor: "cur1" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 5, query: "shirt", after: "cur1" });
	});

	it("handles empty results", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		const result = await searchProducts.handler?.({ query: "nonexistent", limit: 10 }, mockCtx);
		expect(result.products).toEqual([]);
	});
});
