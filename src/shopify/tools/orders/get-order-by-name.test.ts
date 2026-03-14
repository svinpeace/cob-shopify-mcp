import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { getOrderByName } from "./get-order-by-name.tool.js";

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
	orders: {
		edges: [
			{
				node: {
					id: "gid://shopify/Order/123",
					name: "#1001",
					createdAt: "2026-03-01T10:00:00Z",
					updatedAt: "2026-03-02T10:00:00Z",
					displayFinancialStatus: "PAID",
					displayFulfillmentStatus: "FULFILLED",
					totalPriceSet: { shopMoney: { amount: "99.99", currencyCode: "USD" } },
					subtotalPriceSet: { shopMoney: { amount: "89.99", currencyCode: "USD" } },
					totalTaxSet: { shopMoney: { amount: "10.00", currencyCode: "USD" } },
					totalShippingPriceSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
					customer: {
						id: "gid://shopify/Customer/1",
						displayName: "Jane",
						defaultEmailAddress: { emailAddress: "jane@example.com" },
					},
					lineItems: {
						edges: [
							{
								node: {
									title: "Hat",
									quantity: 1,
									sku: "HAT-01",
									variantTitle: "One Size",
									originalUnitPriceSet: { shopMoney: { amount: "29.99", currencyCode: "USD" } },
								},
							},
						],
					},
					fulfillments: [],
					shippingAddress: {
						address1: "456 Oak Ave",
						address2: null,
						city: "Seattle",
						province: "WA",
						zip: "98101",
						country: "US",
					},
					billingAddress: {
						address1: "456 Oak Ave",
						address2: null,
						city: "Seattle",
						province: "WA",
						zip: "98101",
						country: "US",
					},
					note: null,
					tags: [],
				},
			},
		],
	},
};

describe("get_order_by_name", () => {
	it("has correct tool definition", () => {
		expect(getOrderByName.name).toBe("get_order_by_name");
		expect(getOrderByName.domain).toBe("orders");
		expect(getOrderByName.tier).toBe(1);
		expect(getOrderByName.scopes).toEqual(["read_orders"]);
	});

	it("formats name query correctly with hash prefix", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		await getOrderByName.handler?.({ name: "#1001" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { query: "name:#1001" });
	});

	it("adds hash prefix when not provided", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		await getOrderByName.handler?.({ name: "1001" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { query: "name:#1001" });
	});

	it("returns flattened order", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		const result = await getOrderByName.handler?.({ name: "#1001" }, ctx);

		expect(result.order.lineItems).toHaveLength(1);
		expect(result.order.lineItems[0].sku).toBe("HAT-01");
	});

	it("returns null when order not found", async () => {
		const queryFn = vi.fn().mockResolvedValue({ orders: { edges: [] } });
		const ctx = makeCtx(queryFn);

		const result = await getOrderByName.handler?.({ name: "#9999" }, ctx);

		expect(result.order).toBeNull();
	});
});
