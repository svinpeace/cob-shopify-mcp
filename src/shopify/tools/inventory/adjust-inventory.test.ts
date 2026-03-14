import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { adjustInventory } from "./adjust-inventory.tool.js";

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

describe("adjust_inventory", () => {
	it("has correct definition metadata", () => {
		expect(adjustInventory.name).toBe("adjust_inventory");
		expect(adjustInventory.domain).toBe("inventory");
		expect(adjustInventory.tier).toBe(1);
		expect(adjustInventory.scopes).toEqual(["write_inventory"]);
		expect(adjustInventory.input).toHaveProperty("inventory_item_id");
		expect(adjustInventory.input).toHaveProperty("location_id");
		expect(adjustInventory.input).toHaveProperty("delta");
	});

	it("passes positive delta (add) with correct input structure", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryAdjustQuantities: {
				inventoryAdjustmentGroup: {
					reason: "correction",
					changes: [{ name: "available", delta: 5, quantityAfterChange: 25 }],
				},
				userErrors: [],
			},
		});

		const result = await adjustInventory.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				delta: 5,
			},
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: {
				reason: "correction",
				name: "available",
				changes: [
					{
						inventoryItemId: "gid://shopify/InventoryItem/1",
						locationId: "gid://shopify/Location/1",
						delta: 5,
					},
				],
			},
		});
		expect(result.success).toBe(true);
		expect(result.adjustmentGroup).toBeDefined();
	});

	it("passes negative delta (subtract)", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryAdjustQuantities: {
				inventoryAdjustmentGroup: {
					reason: "correction",
					changes: [{ name: "available", delta: -3, quantityAfterChange: 17 }],
				},
				userErrors: [],
			},
		});

		const result = await adjustInventory.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				delta: -3,
			},
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				input: expect.objectContaining({
					changes: [expect.objectContaining({ delta: -3 })],
				}),
			}),
		);
		expect(result.success).toBe(true);
	});

	it("passes custom reason", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryAdjustQuantities: {
				inventoryAdjustmentGroup: { reason: "received", changes: [] },
				userErrors: [],
			},
		});

		await adjustInventory.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/1",
				location_id: "gid://shopify/Location/1",
				delta: 10,
				reason: "received",
			},
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				input: expect.objectContaining({ reason: "received" }),
			}),
		);
	});

	it("returns userErrors on failure", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryAdjustQuantities: {
				inventoryAdjustmentGroup: null,
				userErrors: [{ field: ["input"], message: "Invalid inventory item" }],
			},
		});

		const result = await adjustInventory.handler?.(
			{
				inventory_item_id: "gid://shopify/InventoryItem/999",
				location_id: "gid://shopify/Location/1",
				delta: 5,
			},
			makeCtx(queryFn),
		);

		expect(result.success).toBe(false);
		expect(result.userErrors).toHaveLength(1);
		expect(result.userErrors[0].message).toBe("Invalid inventory item");
	});
});
