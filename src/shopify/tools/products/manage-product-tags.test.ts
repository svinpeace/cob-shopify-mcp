import { beforeEach, describe, expect, it, vi } from "vitest";
import { manageProductTags } from "./manage-product-tags.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("manage_product_tags", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	it("has correct tool definition", () => {
		expect(manageProductTags.name).toBe("manage_product_tags");
		expect(manageProductTags.domain).toBe("products");
		expect(manageProductTags.tier).toBe(1);
		expect(manageProductTags.scopes).toEqual(["write_products"]);
	});

	it("adds tags using tagsAdd mutation", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				tagsAdd: {
					node: { id: "gid://shopify/Product/1" },
					userErrors: [],
				},
			},
		});

		const result = await manageProductTags.handler?.({ id: "gid://shopify/Product/1", add: ["sale", "new"] }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.stringContaining("tagsAdd"), {
			id: "gid://shopify/Product/1",
			tags: ["sale", "new"],
		});
		expect(result.added).toEqual(["sale", "new"]);
		expect(result.productId).toBe("gid://shopify/Product/1");
	});

	it("removes tags using tagsRemove mutation", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				tagsRemove: {
					node: { id: "gid://shopify/Product/1" },
					userErrors: [],
				},
			},
		});

		const result = await manageProductTags.handler?.({ id: "gid://shopify/Product/1", remove: ["clearance"] }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.stringContaining("tagsRemove"), {
			id: "gid://shopify/Product/1",
			tags: ["clearance"],
		});
		expect(result.removed).toEqual(["clearance"]);
	});

	it("adds and removes tags in one call", async () => {
		mockCtx.shopify.query
			.mockResolvedValueOnce({
				data: { tagsAdd: { node: { id: "gid://shopify/Product/1" }, userErrors: [] } },
			})
			.mockResolvedValueOnce({
				data: { tagsRemove: { node: { id: "gid://shopify/Product/1" }, userErrors: [] } },
			});

		const result = await manageProductTags.handler?.(
			{ id: "gid://shopify/Product/1", add: ["premium"], remove: ["budget"] },
			mockCtx,
		);

		expect(mockCtx.shopify.query).toHaveBeenCalledTimes(2);
		expect(result.added).toEqual(["premium"]);
		expect(result.removed).toEqual(["budget"]);
	});

	it("throws on tagsAdd userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				tagsAdd: {
					node: null,
					userErrors: [{ field: ["id"], message: "Product not found" }],
				},
			},
		});

		await expect(
			manageProductTags.handler?.({ id: "gid://shopify/Product/999", add: ["test"] }, mockCtx),
		).rejects.toThrow("Tag add failed");
	});

	it("throws on tagsRemove userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				tagsRemove: {
					node: null,
					userErrors: [{ field: ["id"], message: "Product not found" }],
				},
			},
		});

		await expect(
			manageProductTags.handler?.({ id: "gid://shopify/Product/999", remove: ["test"] }, mockCtx),
		).rejects.toThrow("Tag remove failed");
	});
});
