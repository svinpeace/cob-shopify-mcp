import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { getLocationInventory } from "./get-location-inventory.tool.js";

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

describe("get_location_inventory", () => {
	it("has correct definition metadata", () => {
		expect(getLocationInventory.name).toBe("get_location_inventory");
		expect(getLocationInventory.domain).toBe("inventory");
		expect(getLocationInventory.tier).toBe(1);
		expect(getLocationInventory.scopes).toEqual(["read_inventory", "read_locations"]);
		expect(getLocationInventory.input).toHaveProperty("location_id");
		expect(getLocationInventory.input).toHaveProperty("limit");
	});

	it("calls shopify.query with mapped variables", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			location: {
				id: "gid://shopify/Location/1",
				name: "Warehouse",
				inventoryLevels: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
			},
		});

		await getLocationInventory.handler?.({ location_id: "gid://shopify/Location/1", limit: 20 }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			id: "gid://shopify/Location/1",
			first: 20,
		});
	});

	it("maps response — returns location and flattened levels", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			location: {
				id: "gid://shopify/Location/1",
				name: "Main Warehouse",
				inventoryLevels: {
					edges: [
						{
							node: {
								id: "gid://shopify/InventoryLevel/1",
								item: { id: "gid://shopify/InventoryItem/1", sku: "W-001", tracked: true },
								quantities: [
									{ name: "available", quantity: 30 },
									{ name: "incoming", quantity: 10 },
								],
							},
						},
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		});

		const result = await getLocationInventory.handler?.(
			{ location_id: "gid://shopify/Location/1", limit: 25 },
			makeCtx(queryFn),
		);

		expect(result.location).toEqual({ id: "gid://shopify/Location/1", name: "Main Warehouse" });
		expect(result.inventoryLevels).toHaveLength(1);
		expect(result.inventoryLevels[0].item.sku).toBe("W-001");
		expect(result.pageInfo.hasNextPage).toBe(false);
	});

	it("handles null location", async () => {
		const queryFn = vi.fn().mockResolvedValue({ location: null });

		const result = await getLocationInventory.handler?.(
			{ location_id: "gid://shopify/Location/999", limit: 25 },
			makeCtx(queryFn),
		);

		expect(result.location).toBeNull();
		expect(result.inventoryLevels).toEqual([]);
	});
});
