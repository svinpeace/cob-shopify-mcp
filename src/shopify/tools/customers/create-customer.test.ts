import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { createCustomer } from "./create-customer.tool.js";

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

describe("create_customer", () => {
	it("has correct definition metadata", () => {
		expect(createCustomer.name).toBe("create_customer");
		expect(createCustomer.domain).toBe("customers");
		expect(createCustomer.scopes).toEqual(["write_customers"]);
		expect(createCustomer.input).toHaveProperty("firstName");
		expect(createCustomer.input).toHaveProperty("lastName");
		expect(createCustomer.input).toHaveProperty("email");
	});

	it("maps firstName, lastName, email to CustomerInput", async () => {
		const mockResponse = {
			customerCreate: {
				customer: {
					id: "gid://shopify/Customer/10",
					displayName: "Alice Johnson",
					firstName: "Alice",
					lastName: "Johnson",
					defaultEmailAddress: { emailAddress: "alice@example.com" },
					defaultPhoneNumber: null,
					tags: [],
					note: null,
					state: "ENABLED",
					createdAt: "2024-06-01T00:00:00Z",
				},
				userErrors: [],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await createCustomer.handler?.(
			{ firstName: "Alice", lastName: "Johnson", email: "alice@example.com" },
			ctx,
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: {
				firstName: "Alice",
				lastName: "Johnson",
				email: "alice@example.com",
			},
		});
		expect(result.customer.id).toBe("gid://shopify/Customer/10");
		expect(result.customer.firstName).toBe("Alice");
	});

	it("handles userErrors", async () => {
		const mockResponse = {
			customerCreate: {
				customer: null,
				userErrors: [{ field: ["email"], message: "Email has already been taken" }],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await createCustomer.handler?.({ firstName: "Alice", email: "taken@example.com" }, ctx);

		expect(result.error).toBe(true);
		expect(result.userErrors).toHaveLength(1);
		expect(result.userErrors[0].message).toContain("already been taken");
	});
});
