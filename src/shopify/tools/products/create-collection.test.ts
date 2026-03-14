import { describe, expect, it, vi } from "vitest";
import { createCollection } from "./create-collection.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("create_collection", () => {
	it("has correct tool definition", () => {
		expect(createCollection.name).toBe("create_collection");
		expect(createCollection.domain).toBe("products");
		expect(createCollection.tier).toBe(1);
		expect(createCollection.scopes).toEqual(["write_products"]);
	});

	it("creates collection with title and description", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				collectionCreate: {
					collection: {
						id: "gid://shopify/Collection/1",
						title: "Summer Sale",
						handle: "summer-sale",
					},
					userErrors: [],
				},
			},
		});

		const result = await createCollection.handler?.({ title: "Summer Sale", description: "Hot deals" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			input: {
				title: "Summer Sale",
				descriptionHtml: "Hot deals",
			},
		});
		expect(result.collection.title).toBe("Summer Sale");
	});

	it("throws on userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				collectionCreate: {
					collection: null,
					userErrors: [{ field: ["title"], message: "Title taken" }],
				},
			},
		});

		await expect(createCollection.handler?.({ title: "Existing" }, mockCtx)).rejects.toThrow(
			"Collection creation failed",
		);
	});
});
