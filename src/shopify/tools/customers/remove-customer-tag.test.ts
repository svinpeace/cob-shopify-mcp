import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { removeCustomerTag } from "./remove-customer-tag.tool.js";

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

describe("remove_customer_tag", () => {
	it("has correct definition metadata", () => {
		expect(removeCustomerTag.name).toBe("remove_customer_tag");
		expect(removeCustomerTag.domain).toBe("customers");
		expect(removeCustomerTag.scopes).toEqual(["write_customers"]);
		expect(removeCustomerTag.input).toHaveProperty("id");
		expect(removeCustomerTag.input).toHaveProperty("tags");
	});

	it("uses tagsRemove mutation with customer GID and tags array", async () => {
		const mockResponse = {
			tagsRemove: {
				node: { id: "gid://shopify/Customer/1" },
				userErrors: [],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await removeCustomerTag.handler?.({ id: "gid://shopify/Customer/1", tags: ["vip"] }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { id: "gid://shopify/Customer/1", tags: ["vip"] });
		expect(result.node.id).toBe("gid://shopify/Customer/1");
	});

	it("handles userErrors from tagsRemove", async () => {
		const mockResponse = {
			tagsRemove: {
				node: null,
				userErrors: [{ field: ["id"], message: "Customer not found" }],
			},
		};

		const queryFn = vi.fn().mockResolvedValue(mockResponse);
		const ctx = makeCtx(queryFn);
		const result = await removeCustomerTag.handler?.({ id: "gid://shopify/Customer/999", tags: ["test"] }, ctx);

		expect(result.error).toBe(true);
		expect(result.userErrors).toHaveLength(1);
	});
});
