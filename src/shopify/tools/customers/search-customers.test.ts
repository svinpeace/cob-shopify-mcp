import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { searchCustomers } from "./search-customers.tool.js";

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

describe("search_customers", () => {
	it("has correct definition metadata", () => {
		expect(searchCustomers.name).toBe("search_customers");
		expect(searchCustomers.domain).toBe("customers");
		expect(searchCustomers.scopes).toEqual(["read_customers"]);
		expect(searchCustomers.input).toHaveProperty("query");
		expect(searchCustomers.input).toHaveProperty("limit");
		expect(searchCustomers.input).toHaveProperty("cursor");
	});

	it("passes query string for email/name/phone search", async () => {
		const mockResponse = {
			customers: {
				edges: [
					{
						node: {
							id: "gid://shopify/Customer/2",
							displayName: "Jane Smith",
							defaultEmailAddress: { emailAddress: "jane@example.com" },
							defaultPhoneNumber: null,
							numberOfOrders: 3,
							amountSpent: { amount: "150.00", currencyCode: "USD" },
							tags: [],
							state: "ENABLED",
							createdAt: "2024-02-01T00:00:00Z",
							updatedAt: "2024-06-01T00:00:00Z",
						},
					},
				],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await searchCustomers.handler?.({ query: "email:jane@example.com", limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10, query: "email:jane@example.com" });
		expect(result.customers).toHaveLength(1);
		expect(result.customers[0].email).toBe("jane@example.com");
	});

	it("handles empty search results", async () => {
		const mockResponse = {
			customers: {
				edges: [],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await searchCustomers.handler?.({ query: "nonexistent", limit: 10 }, ctx);

		expect(result.customers).toHaveLength(0);
	});
});
