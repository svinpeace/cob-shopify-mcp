import { describe, expect, it, vi } from "vitest";
import { listCollections } from "./list-collections.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("list_collections", () => {
	it("has correct tool definition", () => {
		expect(listCollections.name).toBe("list_collections");
		expect(listCollections.domain).toBe("products");
		expect(listCollections.tier).toBe(1);
		expect(listCollections.scopes).toEqual(["read_products"]);
	});

	it("calls shopify.query with default limit", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				collections: {
					edges: [{ node: { id: "c1", title: "Summer", handle: "summer" } }],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		const result = await listCollections.handler?.({ limit: 10 }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 10 });
		expect(result.collections).toHaveLength(1);
		expect(result.collections[0].title).toBe("Summer");
	});

	it("passes cursor for pagination", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				collections: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		await listCollections.handler?.({ limit: 5, cursor: "cur1" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), { first: 5, after: "cur1" });
	});

	it("handles empty result", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				collections: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		const result = await listCollections.handler?.({ limit: 10 }, mockCtx);
		expect(result.collections).toEqual([]);
	});
});
