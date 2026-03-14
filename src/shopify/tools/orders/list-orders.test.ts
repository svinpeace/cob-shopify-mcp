import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { listOrders } from "./list-orders.tool.js";

function makeCtx(queryFn = vi.fn()): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

const mockOrdersResponse = {
	orders: {
		edges: [
			{
				node: {
					id: "gid://shopify/Order/1",
					name: "#1001",
					createdAt: "2026-03-01T10:00:00Z",
					displayFinancialStatus: "PAID",
					displayFulfillmentStatus: "FULFILLED",
					totalPriceSet: { shopMoney: { amount: "129.99", currencyCode: "USD" } },
					customer: { id: "gid://shopify/Customer/1", displayName: "John Doe", defaultEmailAddress: { emailAddress: "john@example.com" } },
					lineItems: {
						edges: [
							{
								node: {
									title: "Classic Hoodie",
									quantity: 2,
									sku: "HOOD-SM",
									variantTitle: "Small / Black",
									originalUnitPriceSet: { shopMoney: { amount: "49.99", currencyCode: "USD" } },
								},
							},
						],
					},
					fulfillments: [
						{
							status: "SUCCESS",
							trackingInfo: [{ number: "1Z999AA10123456784", url: "https://tracking.ups.com/123", company: "UPS" }],
						},
					],
				},
			},
		],
		pageInfo: { hasNextPage: false, endCursor: null },
	},
};

describe("list_orders", () => {
	it("has correct tool definition", () => {
		expect(listOrders.name).toBe("list_orders");
		expect(listOrders.domain).toBe("orders");
		expect(listOrders.tier).toBe(1);
		expect(listOrders.scopes).toEqual(["read_orders"]);
	});

	it("calls shopify query with correct variables", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockOrdersResponse);
		const ctx = makeCtx(queryFn);

		await listOrders.handler?.({ limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10, query: undefined, after: undefined });
	});

	it("builds query string from filter params", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockOrdersResponse);
		const ctx = makeCtx(queryFn);

		await listOrders.handler?.(
			{ limit: 5, status: "open", financial_status: "paid", fulfillment_status: "shipped" },
			ctx,
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			first: 5,
			query: "status:open financial_status:paid fulfillment_status:shipped",
			after: undefined,
		});
	});

	it("maps response with flattened lineItems", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockOrdersResponse);
		const ctx = makeCtx(queryFn);

		const result = await listOrders.handler?.({ limit: 10 }, ctx);

		expect(result.orders).toHaveLength(1);
		expect(result.orders[0].lineItems).toHaveLength(1);
		expect(result.orders[0].lineItems[0].sku).toBe("HOOD-SM");
		expect(result.orders[0].lineItems[0].variantTitle).toBe("Small / Black");
	});

	it("includes fulfillments with trackingInfo", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockOrdersResponse);
		const ctx = makeCtx(queryFn);

		const result = await listOrders.handler?.({ limit: 10 }, ctx);

		expect(result.orders[0].fulfillments).toHaveLength(1);
		expect(result.orders[0].fulfillments[0].trackingInfo[0].number).toBe("1Z999AA10123456784");
		expect(result.orders[0].fulfillments[0].trackingInfo[0].company).toBe("UPS");
	});

	it("returns pageInfo for pagination", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockOrdersResponse);
		const ctx = makeCtx(queryFn);

		const result = await listOrders.handler?.({ limit: 10 }, ctx);

		expect(result.pageInfo).toEqual({ hasNextPage: false, endCursor: null });
	});

	it("handles empty result", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orders: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
		});
		const ctx = makeCtx(queryFn);

		const result = await listOrders.handler?.({ limit: 10 }, ctx);

		expect(result.orders).toEqual([]);
	});
});
