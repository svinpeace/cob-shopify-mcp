import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { getCustomer } from "./get-customer.tool.js";

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

describe("get_customer", () => {
	it("has correct definition metadata", () => {
		expect(getCustomer.name).toBe("get_customer");
		expect(getCustomer.domain).toBe("customers");
		expect(getCustomer.scopes).toEqual(["read_customers"]);
		expect(getCustomer.input).toHaveProperty("id");
	});

	it("returns full customer detail with addresses and note", async () => {
		const mockResponse = {
			customer: {
				id: "gid://shopify/Customer/1",
				displayName: "John Doe",
				firstName: "John",
				lastName: "Doe",
				defaultEmailAddress: { emailAddress: "john@example.com" },
				defaultPhoneNumber: { phoneNumber: "+1234567890" },
				numberOfOrders: 5,
				amountSpent: { amount: "250.00", currencyCode: "USD" },
				tags: ["vip"],
				note: "Important customer",
				state: "ENABLED",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-06-01T00:00:00Z",
				defaultAddress: {
					id: "gid://shopify/MailingAddress/1",
					address1: "123 Main St",
					address2: null,
					city: "New York",
					province: "NY",
					country: "US",
					zip: "10001",
					phone: "+1234567890",
				},
				addressesV2: {
					nodes: [
						{
							address1: "123 Main St",
							address2: null,
							city: "New York",
							province: "NY",
							country: "US",
							zip: "10001",
							phone: "+1234567890",
						},
					],
				},
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await getCustomer.handler?.({ id: "gid://shopify/Customer/1" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { id: "gid://shopify/Customer/1" });
		expect(result.customer.id).toBe("gid://shopify/Customer/1");
		expect(result.customer.note).toBe("Important customer");
		expect(result.customer.addresses?.nodes).toHaveLength(1);
		expect(result.customer.defaultAddress.city).toBe("New York");
	});
});
