import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { listInventoryLevels } from "./list-inventory-levels.tool.js";

function makeCtx(queryFn: any): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {
			auth: { method: "token", store_domain: "test.myshopify.com", access_token: "tok" },
			shopify: { api_version: "2025-01", max_retries: 3, cache: { read_ttl: 300, search_ttl: 60, analytics_ttl: 900 } },
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

describe("list_inventory_levels", () => {
	it("has correct definition metadata", () => {
		expect(listInventoryLevels.name).toBe("list_inventory_levels");
		expect(listInventoryLevels.domain).toBe("inventory");
		expect(listInventoryLevels.tier).toBe(1);
		expect(listInventoryLevels.scopes).toEqual(["read_inventory", "read_locations"]);
		expect(listInventoryLevels.input).toHaveProperty("limit");
		expect(listInventoryLevels.input).toHaveProperty("cursor");
	});

	it("calls shopify.query with correct variables", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
		});

		await listInventoryLevels.handler?.({ limit: 15 }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 15 });
	});

	it("passes cursor as after variable", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
		});

		await listInventoryLevels.handler?.({ limit: 10, cursor: "abc123" }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { first: 10, after: "abc123" });
	});

	it("maps response — flattens edges and returns pageInfo", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges: [
					{
						node: {
							id: "gid://shopify/InventoryItem/1",
							sku: "W-001",
							tracked: true,
							inventoryLevels: {
								edges: [
									{
										node: {
											id: "gid://shopify/InventoryLevel/1",
											location: { id: "gid://shopify/Location/1", name: "Warehouse A" },
											quantities: [
												{ name: "available", quantity: 50 },
												{ name: "on_hand", quantity: 55 },
											],
										},
									},
								],
							},
						},
					},
				],
				pageInfo: { hasNextPage: true, endCursor: "cursor123" },
			},
		});

		const result = await listInventoryLevels.handler?.({ limit: 25 }, makeCtx(queryFn));

		expect(result.inventoryItems).toHaveLength(1);
		expect(result.inventoryItems[0].sku).toBe("W-001");
		expect(result.inventoryItems[0].inventoryLevels).toHaveLength(1);
		expect(result.pageInfo.hasNextPage).toBe(true);
		expect(result.pageInfo.endCursor).toBe("cursor123");
	});

	it("handles empty result", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
		});

		const result = await listInventoryLevels.handler?.({ limit: 25 }, makeCtx(queryFn));

		expect(result.inventoryItems).toEqual([]);
		expect(result.pageInfo.hasNextPage).toBe(false);
	});
});
