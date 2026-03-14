import { describe, expect, it } from "vitest";
import { getInventoryItem } from "./get-inventory-item.tool.js";

describe("get_inventory_item", () => {
	it("has correct definition metadata", () => {
		expect(getInventoryItem.name).toBe("get_inventory_item");
		expect(getInventoryItem.domain).toBe("inventory");
		expect(getInventoryItem.tier).toBe(1);
		expect(getInventoryItem.scopes).toEqual(["read_inventory"]);
		expect(getInventoryItem.input).toHaveProperty("id");
	});

	it("maps response — flattens inventoryLevels edges", () => {
		const mockData = {
			inventoryItem: {
				id: "gid://shopify/InventoryItem/1",
				sku: "WIDGET-001",
				tracked: true,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-06-01T00:00:00Z",
				inventoryLevels: {
					edges: [
						{
							node: {
								id: "gid://shopify/InventoryLevel/1",
								location: {
									id: "gid://shopify/Location/1",
									name: "Main Warehouse",
								},
								quantities: [
									{ name: "available", quantity: 25 },
									{ name: "committed", quantity: 5 },
									{ name: "on_hand", quantity: 30 },
								],
							},
						},
					],
				},
			},
		};

		const result = getInventoryItem.response?.(mockData);

		expect(result.inventoryItem.id).toBe("gid://shopify/InventoryItem/1");
		expect(result.inventoryItem.sku).toBe("WIDGET-001");
		expect(result.inventoryItem.tracked).toBe(true);
		expect(result.inventoryItem.inventoryLevels).toHaveLength(1);
		expect(result.inventoryItem.inventoryLevels[0].location.name).toBe("Main Warehouse");
		expect(result.inventoryItem.inventoryLevels[0].quantities).toHaveLength(3);
	});

	it("maps response — handles null inventoryItem", () => {
		const result = getInventoryItem.response?.({ inventoryItem: null });
		expect(result.inventoryItem).toBeNull();
	});

	it("maps response — handles empty inventoryLevels", () => {
		const result = getInventoryItem.response?.({
			inventoryItem: {
				id: "gid://shopify/InventoryItem/2",
				sku: "EMPTY",
				tracked: false,
				inventoryLevels: { edges: [] },
			},
		});

		expect(result.inventoryItem.inventoryLevels).toEqual([]);
	});

	it("maps response — unwraps data wrapper", () => {
		const result = getInventoryItem.response?.({
			data: {
				inventoryItem: {
					id: "gid://shopify/InventoryItem/3",
					sku: "WRAPPED",
					tracked: true,
					inventoryLevels: { edges: [] },
				},
			},
		});

		expect(result.inventoryItem.sku).toBe("WRAPPED");
	});
});
