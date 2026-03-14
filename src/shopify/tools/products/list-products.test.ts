import { describe, expect, it, vi } from "vitest";
import { listProducts } from "./list-products.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("list_products", () => {
	it("has correct tool definition", () => {
		expect(listProducts.name).toBe("list_products");
		expect(listProducts.domain).toBe("products");
		expect(listProducts.tier).toBe(1);
		expect(listProducts.scopes).toEqual(["read_products"]);
	});

	it("calls shopify.query with default limit", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: {
					edges: [{ node: { id: "gid://shopify/Product/1", title: "Test", variants: { edges: [] } } }],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		const result = await listProducts.handler?.({ limit: 10 }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 10 });
		expect(result.products).toHaveLength(1);
		expect(result.products[0].title).toBe("Test");
		expect(result.pageInfo.hasNextPage).toBe(false);
	});

	it("builds query string from status filter", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		await listProducts.handler?.({ limit: 10, status: "ACTIVE" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 10, query: "status:ACTIVE" });
	});

	it("passes cursor as after variable", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		await listProducts.handler?.({ limit: 5, cursor: "abc123" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 5, after: "abc123" });
	});

	it("flattens variant edges in response", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: {
					edges: [
						{
							node: {
								id: "gid://shopify/Product/1",
								title: "Hoodie",
								variants: {
									edges: [{ node: { id: "v1", title: "Small", price: "29.99", sku: "H-SM" } }],
								},
							},
						},
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		const result = await listProducts.handler?.({ limit: 10 }, mockCtx);
		expect(result.products[0].variants).toEqual([{ id: "v1", title: "Small", price: "29.99", sku: "H-SM" }]);
	});

	it("handles empty result", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				products: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		const result = await listProducts.handler?.({ limit: 10 }, mockCtx);
		expect(result.products).toEqual([]);
	});
});
