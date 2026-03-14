import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-inventory-by-sku.graphql";

export const getInventoryBySku = defineTool({
	name: "get_inventory_by_sku",
	domain: "inventory",
	tier: 1,
	description: "Look up inventory items by SKU string. Uses the inventoryItems query with a SKU filter.",
	scopes: ["read_inventory"],
	input: {
		sku: z.string().describe("SKU string to search for"),
		limit: z.number().min(1).max(50).default(10),
	},
	handler: async (input: { sku: string; limit: number }, ctx: ExecutionContext) => {
		const result = await ctx.shopify.query(query, {
			query: `sku:${input.sku}`,
			first: input.limit,
		});
		const raw = result.data ?? result;

		return {
			inventoryItems:
				raw.inventoryItems?.edges?.map((e: any) => ({
					...e.node,
					inventoryLevels: e.node.inventoryLevels?.edges?.map((l: any) => l.node) ?? [],
				})) ?? [],
		};
	},
});
