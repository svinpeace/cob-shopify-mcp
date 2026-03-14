import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { getInventoryBySku } from "./get-inventory-by-sku.tool.js";

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

describe("get_inventory_by_sku", () => {
	it("has correct definition metadata", () => {
		expect(getInventoryBySku.name).toBe("get_inventory_by_sku");
		expect(getInventoryBySku.domain).toBe("inventory");
		expect(getInventoryBySku.tier).toBe(1);
		expect(getInventoryBySku.scopes).toEqual(["read_inventory"]);
		expect(getInventoryBySku.input).toHaveProperty("sku");
	});

	it("passes sku query filter to shopify.query", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges: [
					{
						node: {
							id: "gid://shopify/InventoryItem/1",
							sku: "WIDGET-001",
							tracked: true,
							inventoryLevels: { edges: [] },
						},
					},
				],
			},
		});

		const ctx = makeCtx(queryFn);
		await getInventoryBySku.handler?.({ sku: "WIDGET-001", limit: 10 }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { query: "sku:WIDGET-001", first: 10 });
	});

	it("maps response — flattens edges and inventoryLevels", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges: [
					{
						node: {
							id: "gid://shopify/InventoryItem/1",
							sku: "HOOD-SM",
							tracked: true,
							inventoryLevels: {
								edges: [
									{
										node: {
											id: "gid://shopify/InventoryLevel/1",
											location: { id: "gid://shopify/Location/1", name: "Warehouse" },
											quantities: [{ name: "available", quantity: 15 }],
										},
									},
								],
							},
						},
					},
				],
			},
		});

		const result = await getInventoryBySku.handler?.({ sku: "HOOD-SM", limit: 10 }, makeCtx(queryFn));

		expect(result.inventoryItems).toHaveLength(1);
		expect(result.inventoryItems[0].sku).toBe("HOOD-SM");
		expect(result.inventoryItems[0].inventoryLevels).toHaveLength(1);
		expect(result.inventoryItems[0].inventoryLevels[0].location.name).toBe("Warehouse");
	});

	it("handles empty result", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: { edges: [] },
		});

		const result = await getInventoryBySku.handler?.({ sku: "NONEXISTENT", limit: 10 }, makeCtx(queryFn));
		expect(result.inventoryItems).toEqual([]);
	});
});
