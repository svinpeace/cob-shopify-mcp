import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { updateCustomer } from "./update-customer.tool.js";

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

describe("update_customer", () => {
	it("has correct definition metadata", () => {
		expect(updateCustomer.name).toBe("update_customer");
		expect(updateCustomer.domain).toBe("customers");
		expect(updateCustomer.scopes).toEqual(["write_customers"]);
		expect(updateCustomer.input).toHaveProperty("id");
		expect(updateCustomer.input).toHaveProperty("firstName");
		expect(updateCustomer.input).toHaveProperty("note");
	});

	it("updates customer fields and returns updated customer", async () => {
		const mockResponse = {
			customerUpdate: {
				customer: {
					id: "gid://shopify/Customer/1",
					displayName: "John Updated",
					firstName: "John",
					lastName: "Updated",
					defaultEmailAddress: { emailAddress: "john@example.com" },
					defaultPhoneNumber: { phoneNumber: "+1234567890" },
					note: "Updated note",
					tags: ["vip"],
					state: "ENABLED",
					updatedAt: "2024-06-15T00:00:00Z",
				},
				userErrors: [],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await updateCustomer.handler?.(
			{ id: "gid://shopify/Customer/1", lastName: "Updated", note: "Updated note" },
			ctx,
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: {
				id: "gid://shopify/Customer/1",
				lastName: "Updated",
				note: "Updated note",
			},
		});
		expect(result.customer.lastName).toBe("Updated");
		expect(result.customer.note).toBe("Updated note");
	});

	it("handles userErrors", async () => {
		const mockResponse = {
			customerUpdate: {
				customer: null,
				userErrors: [{ field: ["email"], message: "Email is invalid" }],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await updateCustomer.handler?.({ id: "gid://shopify/Customer/1", email: "invalid" }, ctx);

		expect(result.error).toBe(true);
		expect(result.userErrors).toHaveLength(1);
	});
});
