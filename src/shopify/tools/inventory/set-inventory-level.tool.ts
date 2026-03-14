import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./set-inventory-level.graphql";

export const setInventoryLevel = defineTool({
	name: "set_inventory_level",
	domain: "inventory",
	tier: 1,
	description: "Set inventory to an exact quantity at a specific location. Uses the inventorySetQuantities mutation.",
	scopes: ["write_inventory"],
	input: {
		inventory_item_id: z.string().describe("Shopify GID of the inventory item"),
		location_id: z.string().describe("Shopify GID of the location"),
		quantity: z.number().min(0).describe("Exact quantity to set"),
		reason: z.string().optional().describe("Reason for setting quantity (e.g. 'correction', 'cycle_count_available')"),
	},
	handler: async (
		input: {
			inventory_item_id: string;
			location_id: string;
			quantity: number;
			reason?: string;
		},
		ctx: ExecutionContext,
	) => {
		const result = await ctx.shopify.query(mutation, {
			input: {
				reason: input.reason ?? "correction",
				name: "available",
				ignoreCompareQuantity: true,
				quantities: [
					{
						inventoryItemId: input.inventory_item_id,
						locationId: input.location_id,
						quantity: input.quantity,
					},
				],
			},
		});

		const raw = result.data ?? result;
		const payload = raw.inventorySetQuantities;

		if (payload?.userErrors?.length > 0) {
			return {
				success: false,
				userErrors: payload.userErrors,
			};
		}

		return {
			success: true,
			adjustmentGroup: payload?.inventoryAdjustmentGroup ?? null,
		};
	},
});
