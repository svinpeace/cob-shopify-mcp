import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { setInventoryLevel } from "./set-inventory-level.tool.js";

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

describe("set_inventory_level", () => {
	it("has correct definition metadata", () => {
		expect(setInventoryLevel.name).toBe("set_inventory_level");
		expect(setInventoryLevel.domain).toBe("inventory");
		expect(setInventoryLevel.tier).toBe(1);
		expect(setInventoryLevel.scopes).toEqual(["write_inventory"]);
		expect(setInventoryLevel.input).toHaveProperty("inventory_item_id");
		expect(setInventoryLevel.input).toHaveProperty("location_id");
		expect(setInventoryLevel.input).toHaveProperty("quantity");
	});

	it("passes exact quantity with correct input structure", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventorySetQuantities: {
				inventoryAdjustmentGroup: {
					reason: "correction",
					changes: [{ name: "available", delta: 20, quantityAfterChange: 100 }],
				},
				userErrors: [],
			},
		});

		const result = await setInventoryLevel.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				quantity: 100,
			},
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: {
				reason: "correction",
				name: "available",
				ignoreCompareQuantity: true,
				quantities: [
					{
						inventoryItemId: "gid://shopify/InventoryItem/1",
						locationId: "gid://shopify/Location/1",
						quantity: 100,
					},
				],
			},
		});
		expect(result.success).toBe(true);
		expect(result.adjustmentGroup).toBeDefined();
	});

	it("passes custom reason", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventorySetQuantities: {
				inventoryAdjustmentGroup: { reason: "cycle_count_available", changes: [] },
				userErrors: [],
			},
		});

		await setInventoryLevel.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				quantity: 50,
				reason: "cycle_count_available",
			},
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				input: expect.objectContaining({ reason: "cycle_count_available" }),
			}),
		);
	});

	it("returns userErrors on failure", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventorySetQuantities: {
				inventoryAdjustmentGroup: null,
				userErrors: [{ field: ["input"], message: "Inventory item not found" }],
			},
		});

		const result = await setInventoryLevel.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/999",
				location_id: "gid://shopify/Location/1",
				quantity: 50,
			},
			makeCtx(queryFn),
		);

		expect(result.success).toBe(false);
		expect(result.userErrors).toHaveLength(1);
		expect(result.userErrors[0].message).toBe("Inventory item not found");
	});

	it("sets quantity to zero", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventorySetQuantities: {
				inventoryAdjustmentGroup: {
					reason: "correction",
					changes: [{ name: "available", delta: -30, quantityAfterChange: 0 }],
				},
				userErrors: [],
			},
		});

		const result = await setInventoryLevel.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				quantity: 0,
			},
			makeCtx(queryFn),
		);

		expect(result.success).toBe(true);
		expect(queryFn).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				input: expect.objectContaining({
					quantities: [expect.objectContaining({ quantity: 0 })],
				}),
			}),
		);
	});
});
