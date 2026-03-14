import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { getCustomerOrders } from "./get-customer-orders.tool.js";

function makeCtx(queryFn: any): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {
			auth: { method: "token", store_domain: "test.myshopify.com", access_token: "tok" },
			shopify: {
				api_version: "2025-01",
				max_retries: 3,
				cache: { read_ttl: 300, search_ttl: 60, analytics_ttl: 900 },
			},
			tools: { read_only: false, disable: [], enable: [], custom_paths: [] },
			transport: { type: "stdio", port: 3000, host: "localhost" },
			storage: { backend: "json", path: "./data", encrypt_tokens: false },
			observability: { log_level: "info", audit_log: false, metrics: false },
			rate_limit: { respect_shopify_cost: true, max_concurrent: 5 },
		},
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: new CostTracker(),
	};
}

describe("get_customer_orders", () => {
	it("has correct definition metadata", () => {
		expect(getCustomerOrders.name).toBe("get_customer_orders");
		expect(getCustomerOrders.domain).toBe("customers");
		expect(getCustomerOrders.scopes).toEqual(["read_customers"]);
		expect(getCustomerOrders.input).toHaveProperty("customer_id");
		expect(getCustomerOrders.input).toHaveProperty("limit");
	});

	it("passes customer GID and returns order list", async () => {
		const mockResponse = {
			customer: {
				id: "gid://shopify/Customer/1",
				displayName: "John Doe",
				orders: {
					edges: [
						{
							node: {
								id: "gid://shopify/Order/100",
								name: "#1001",
								createdAt: "2024-03-01T00:00:00Z",
								displayFinancialStatus: "PAID",
								displayFulfillmentStatus: "FULFILLED",
								totalPriceSet: {
									shopMoney: {
										amount: "99.99",
										currencyCode: "USD",
									},
								},
							},
						},
						{
							node: {
								id: "gid://shopify/Order/101",
								name: "#1002",
								createdAt: "2024-04-01T00:00:00Z",
								displayFinancialStatus: "PAID",
								displayFulfillmentStatus: "UNFULFILLED",
								totalPriceSet: {
									shopMoney: {
										amount: "49.99",
										currencyCode: "USD",
									},
								},
							},
						},
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await getCustomerOrders.handler?.({ customer_id: "gid://shopify/Customer/1", limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { id: "gid://shopify/Customer/1", first: 10 });
		expect(result.orders).toHaveLength(2);
		expect(result.orders[0].name).toBe("#1001");
		expect(result.customer.id).toBe("gid://shopify/Customer/1");
		expect(result.pageInfo.hasNextPage).toBe(false);
	});

	it("handles empty order list", async () => {
		const mockResponse = {
			customer: {
				id: "gid://shopify/Customer/2",
				displayName: "New Customer",
				orders: {
					edges: [],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await getCustomerOrders.handler?.({ customer_id: "gid://shopify/Customer/2", limit: 10 }, ctx);

		expect(result.orders).toHaveLength(0);
	});
});
