import { describe, expect, it, vi } from "vitest";
import { updateProductStatus } from "./update-product-status.tool.js";

const mockCtx = {
	shopify: { query: vi.fn() },
	config: {},
	storage: {},
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	costTracker: { recordCall: vi.fn() },
} as any;

describe("update_product_status", () => {
	it("has correct tool definition", () => {
		expect(updateProductStatus.name).toBe("update_product_status");
		expect(updateProductStatus.domain).toBe("products");
		expect(updateProductStatus.tier).toBe(1);
		expect(updateProductStatus.scopes).toEqual(["write_products"]);
	});

	it("maps status enum correctly", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productUpdate: {
					product: {
						id: "gid://shopify/Product/1",
						title: "Hoodie",
						status: "ARCHIVED",
					},
					userErrors: [],
				},
			},
		});

		const result = await updateProductStatus.handler?.({ id: "gid://shopify/Product/1", status: "ARCHIVED" }, mockCtx);

		expect(mockCtx.shopify.query).toHaveBeenCalledWith(expect.any(String), {
			product: { id: "gid://shopify/Product/1", status: "ARCHIVED" },
		});
		expect(result.product.status).toBe("ARCHIVED");
	});

	it("throws on userErrors", async () => {
		mockCtx.shopify.query.mockResolvedValue({
			data: {
				productUpdate: {
					product: null,
					userErrors: [{ field: ["status"], message: "Invalid status" }],
				},
			},
		});

		await expect(
			updateProductStatus.handler?.({ id: "gid://shopify/Product/1", status: "ACTIVE" }, mockCtx),
		).rejects.toThrow("Status update failed");
	});
});
