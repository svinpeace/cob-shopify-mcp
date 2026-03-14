import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { listCustomers } from "./list-customers.tool.js";

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

describe("list_customers", () => {
	it("has correct definition metadata", () => {
		expect(listCustomers.name).toBe("list_customers");
		expect(listCustomers.domain).toBe("customers");
		expect(listCustomers.tier).toBe(1);
		expect(listCustomers.scopes).toEqual(["read_customers"]);
		expect(listCustomers.input).toHaveProperty("limit");
		expect(listCustomers.input).toHaveProperty("cursor");
	});

	it("calls ctx.shopify.query and maps response correctly", async () => {
		const mockResponse = {
			customers: {
				edges: [
					{
						node: {
							id: "gid://shopify/Customer/1",
							displayName: "John Doe",
							defaultEmailAddress: { emailAddress: "john@example.com" },
							defaultPhoneNumber: { phoneNumber: "+1234567890" },
							numberOfOrders: 5,
							amountSpent: { amount: "250.00", currencyCode: "USD" },
							tags: ["vip"],
							state: "ENABLED",
							createdAt: "2024-01-01T00:00:00Z",
							updatedAt: "2024-06-01T00:00:00Z",
						},
					},
				],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await listCustomers.handler?.({ limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10 });
		expect(result.customers).toHaveLength(1);
		expect(result.customers[0].displayName).toBe("John Doe");
		expect(result.customers[0].numberOfOrders).toBe(5);
		expect(result.customers[0].amountSpent.amount).toBe("250.00");
		expect(result.pageInfo.hasNextPage).toBe(false);
	});

	it("passes cursor for pagination", async () => {
		const mockResponse = {
			customers: {
				edges: [],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		await listCustomers.handler?.({ limit: 10, cursor: "abc123" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10, after: "abc123" });
	});
});
