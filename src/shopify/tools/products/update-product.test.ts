import { describe, expect, it, vi } from "vitest";
import { updateProduct } from "./update-product.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("update_product", () => {
	it("has correct tool definition", () => {
		expect(updateProduct.name).toBe("update_product");
		expect(updateProduct.domain).toBe("products");
		expect(updateProduct.tier).toBe(1);
		expect(updateProduct.scopes).toEqual(["write_products"]);
	});

	it("maps input fields to ProductInput with id", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productUpdate: {
					product: {
						id: "gid://shopify/Product/1",
						title: "Updated Hoodie",
						status: "ACTIVE",
					},
					userErrors: [],
				},
			},
		});

		const result = await updateProduct.handler?.(
			{
				id: "gid://shopify/Product/1",
				title: "Updated Hoodie",
				vendor: "NewBrand",
			},
			mockCtx,
		);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			product: {
				id: "gid://shopify/Product/1",
				title: "Updated Hoodie",
				vendor: "NewBrand",
			},
		});
		expect(result.product.title).toBe("Updated Hoodie");
	});

	it("throws on userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productUpdate: {
					product: null,
					userErrors: [{ field: ["id"], message: "Product not found" }],
				},
			},
		});

		await expect(updateProduct.handler?.({ id: "gid://shopify/Product/999" }, mockCtx)).rejects.toThrow(
			"Product update failed",
		);
	});
});
