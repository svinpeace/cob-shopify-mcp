import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { getCustomerLifetimeValue } from "./get-customer-lifetime-value.tool.js";

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

describe("get_customer_lifetime_value", () => {
	it("has correct definition metadata", () => {
		expect(getCustomerLifetimeValue.name).toBe("get_customer_lifetime_value");
		expect(getCustomerLifetimeValue.domain).toBe("customers");
		expect(getCustomerLifetimeValue.scopes).toEqual(["read_customers"]);
		expect(getCustomerLifetimeValue.input).toHaveProperty("customer_id");
	});

	it("computes avgOrderValue from totalSpent / numberOfOrders", async () => {
		const mockResponse = {
			customer: {
				id: "gid://shopify/Customer/1",
				displayName: "John Doe",
				defaultEmailAddress: { emailAddress: "john@example.com" },
				numberOfOrders: 4,
				amountSpent: { amount: "500.00", currencyCode: "USD" },
				firstOrder: {
					edges: [{ node: { id: "gid://shopify/Order/1", createdAt: "2023-01-15T00:00:00Z" } }],
				},
				lastOrder: {
					edges: [{ node: { id: "gid://shopify/Order/4", createdAt: "2024-06-01T00:00:00Z" } }],
				},
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await getCustomerLifetimeValue.handler?.({ customer_id: "gid://shopify/Customer/1" }, ctx);

		expect(result.lifetimeValue.totalSpent.amount).toBe("500.00");
		expect(result.lifetimeValue.ordersCount).toBe(4);
		expect(result.lifetimeValue.avgOrderValue).toBe(125);
		expect(result.lifetimeValue.currency).toBe("USD");
		expect(result.lifetimeValue.firstOrderDate).toBe("2023-01-15T00:00:00Z");
		expect(result.lifetimeValue.lastOrderDate).toBe("2024-06-01T00:00:00Z");
	});

	it("returns avgOrderValue of 0 when numberOfOrders is 0", async () => {
		const mockResponse = {
			customer: {
				id: "gid://shopify/Customer/2",
				displayName: "New Customer",
				defaultEmailAddress: { emailAddress: "new@example.com" },
				numberOfOrders: 0,
				amountSpent: { amount: "0.00", currencyCode: "USD" },
				firstOrder: { edges: [] },
				lastOrder: { edges: [] },
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await getCustomerLifetimeValue.handler?.({ customer_id: "gid://shopify/Customer/2" }, ctx);

		expect(result.lifetimeValue.avgOrderValue).toBe(0);
		expect(result.lifetimeValue.firstOrderDate).toBeNull();
		expect(result.lifetimeValue.lastOrderDate).toBeNull();
	});
});
