import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { createDraftOrder } from "./create-draft-order.tool.js";

function makeCtx(queryFn = vi.fn()): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

const mockResponse = {
	draftOrderCreate: {
		draftOrder: {
			id: "gid://shopify/DraftOrder/1",
			name: "#D1",
			status: "OPEN",
			totalPriceSet: { shopMoney: { amount: "99.98", currencyCode: "USD" } },
			subtotalPriceSet: { shopMoney: { amount: "89.98", currencyCode: "USD" } },
			totalTaxSet: { shopMoney: { amount: "10.00", currencyCode: "USD" } },
			customer: null,
			lineItems: {
				edges: [
					{
						node: {
							title: "Classic Hoodie",
							quantity: 2,
							originalUnitPriceSet: { shopMoney: { amount: "49.99", currencyCode: "USD" } },
						},
					},
				],
			},
			note2: "Rush order",
		},
		userErrors: [],
	},
};

describe("create_draft_order", () => {
	it("has correct tool definition", () => {
		expect(createDraftOrder.name).toBe("create_draft_order");
		expect(createDraftOrder.domain).toBe("orders");
		expect(createDraftOrder.tier).toBe(1);
		expect(createDraftOrder.scopes).toEqual(["write_draft_orders"]);
	});

	it("maps line items to DraftOrderLineItemInput", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		await createDraftOrder.handler?.(
			{
				line_items: [{ variant_id: "gid://shopify/ProductVariant/1", quantity: 2 }],
				note: "Rush order",
			},
			ctx,
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: {
				lineItems: [{ variantId: "gid://shopify/ProductVariant/1", quantity: 2 }],
				note2: "Rush order",
			},
		});
	});

	it("includes customer_id when provided", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		await createDraftOrder.handler?.(
			{
				line_items: [{ variant_id: "gid://shopify/ProductVariant/1", quantity: 1 }],
				customer_id: "gid://shopify/Customer/1",
			},
			ctx,
		);

		const callArgs = queryFn.mock.calls[0][1];
		expect(callArgs.input.customerId).toBe("gid://shopify/Customer/1");
	});

	it("returns draft order with flattened lineItems", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		const result = await createDraftOrder.handler?.(
			{ line_items: [{ variant_id: "gid://shopify/ProductVariant/1", quantity: 2 }] },
			ctx,
		);

		expect(result.draftOrder.lineItems).toHaveLength(1);
		expect(result.draftOrder.lineItems[0].title).toBe("Classic Hoodie");
	});

	it("returns errors when userErrors present", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			draftOrderCreate: {
				draftOrder: null,
				userErrors: [{ field: ["lineItems"], message: "Invalid variant" }],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await createDraftOrder.handler?.({ line_items: [{ variant_id: "bad-id", quantity: 1 }] }, ctx);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toBe("Invalid variant");
	});
});
