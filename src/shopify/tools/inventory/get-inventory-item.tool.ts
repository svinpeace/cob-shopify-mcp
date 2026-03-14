import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-inventory-item.graphql";

export const getInventoryItem = defineTool({
	name: "get_inventory_item",
	domain: "inventory",
	tier: 1,
	description:
		"Get an inventory item by its Shopify GID. Returns SKU, tracked status, and inventory levels per location with quantities.",
	scopes: ["read_inventory"],
	input: {
		id: z.string().describe("Shopify GID of the inventory item"),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const item = raw.inventoryItem;
		if (!item) return { inventoryItem: null };
		return {
			inventoryItem: {
				...item,
				inventoryLevels: item.inventoryLevels?.edges?.map((e: any) => e.node) ?? [],
			},
		};
	},
});
