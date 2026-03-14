import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { searchOrders } from "./search-orders.tool.js";

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
					id: "gid://shopify/Order/1",
					name: "#1001",
					createdAt: "2026-03-01T10:00:00Z",
					displayFinancialStatus: "PAID",
					displayFulfillmentStatus: "FULFILLED",
					totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
					customer: { id: "gid://shopify/Customer/1", displayName: "Jane", defaultEmailAddress: { emailAddress: "jane@example.com" } },
					lineItems: {
						edges: [
							{
								node: {
									title: "T-Shirt",
									quantity: 1,
									sku: "TS-01",
									variantTitle: "M",
									originalUnitPriceSet: { shopMoney: { amount: "25.00", currencyCode: "USD" } },
								},
							},
						],
					},
					fulfillments: [],
				},
			},
		],
		pageInfo: { hasNextPage: false, endCursor: null },
	},
};

describe("search_orders", () => {
	it("has correct tool definition", () => {
		expect(searchOrders.name).toBe("search_orders");
		expect(searchOrders.domain).toBe("orders");
		expect(searchOrders.tier).toBe(1);
		expect(searchOrders.scopes).toEqual(["read_orders"]);
	});

	it("calls shopify query with search string", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		await searchOrders.handler?.({ query: "name:#1001", limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10, query: "name:#1001", after: undefined });
	});

	it("maps response correctly", async () => {
		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);

		const result = await searchOrders.handler?.({ query: "jane@example.com", limit: 10 }, ctx);

		expect(result.orders).toHaveLength(1);
		expect(result.orders[0].lineItems[0].sku).toBe("TS-01");
	});

	it("handles empty result", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orders: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
		});
		const ctx = makeCtx(queryFn);

		const result = await searchOrders.handler?.({ query: "nonexistent", limit: 10 }, ctx);

		expect(result.orders).toEqual([]);
	});
});
