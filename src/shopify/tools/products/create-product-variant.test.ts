import { describe, expect, it, vi } from "vitest";
import { createProductVariant } from "./create-product-variant.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("create_product_variant", () => {
	it("has correct tool definition", () => {
		expect(createProductVariant.name).toBe("create_product_variant");
		expect(createProductVariant.domain).toBe("products");
		expect(createProductVariant.tier).toBe(1);
		expect(createProductVariant.scopes).toEqual(["write_products"]);
	});

	it("creates variant with correct input", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productVariantsBulkCreate: {
					productVariants: [
						{
							id: "gid://shopify/ProductVariant/1",
							title: "Large",
							price: "39.99",
							sku: "H-LG",
						},
					],
					userErrors: [],
				},
			},
		});

		const result = await createProductVariant.handler?.(
			{
				product_id: "gid://shopify/Product/1",
				price: "39.99",
				sku: "H-LG",
				options: ["Large"],
			},
			mockCtx,
		);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			productId: "gid://shopify/Product/1",
			variants: [
				{
					price: "39.99",
					sku: "H-LG",
					optionValues: [{ name: "Large" }],
				},
			],
		});
		expect(result.variant.id).toBe("gid://shopify/ProductVariant/1");
	});

	it("throws on userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productVariantsBulkCreate: {
					productVariants: [],
					userErrors: [{ field: ["price"], message: "Price is invalid" }],
				},
			},
		});

		await expect(
			createProductVariant.handler?.({ product_id: "gid://shopify/Product/1", price: "abc" }, mockCtx),
		).rejects.toThrow("Variant creation failed");
	});
});
