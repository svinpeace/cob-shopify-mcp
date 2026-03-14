import { describe, expect, it, vi } from "vitest";
import { createProduct } from "./create-product.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("create_product", () => {
	it("has correct tool definition", () => {
		expect(createProduct.name).toBe("create_product");
		expect(createProduct.domain).toBe("products");
		expect(createProduct.tier).toBe(1);
		expect(createProduct.scopes).toEqual(["write_products"]);
	});

	it("maps input fields to ProductInput", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productCreate: {
					product: {
						id: "gid://shopify/Product/1",
						title: "New Hoodie",
						handle: "new-hoodie",
						status: "DRAFT",
						variants: { edges: [] },
					},
					userErrors: [],
				},
			},
		});

		const result = await createProduct.handler?.(
			{
				title: "New Hoodie",
				description: "<p>A great hoodie</p>",
				vendor: "MyBrand",
				product_type: "Apparel",
				status: "DRAFT",
				tags: ["sale", "new"],
			},
			mockCtx,
		);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			product: {
				title: "New Hoodie",
				descriptionHtml: "<p>A great hoodie</p>",
				vendor: "MyBrand",
				productType: "Apparel",
				status: "DRAFT",
				tags: ["sale", "new"],
			},
		});
		expect(result.product.id).toBe("gid://shopify/Product/1");
	});

	it("throws on userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productCreate: {
					product: null,
					userErrors: [{ field: ["title"], message: "Title is required" }],
				},
			},
		});

		await expect(createProduct.handler?.({ title: "" }, mockCtx)).rejects.toThrow(
			"Product creation failed: Title is required",
		);
	});
});
