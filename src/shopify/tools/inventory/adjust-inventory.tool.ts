import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./adjust-inventory.graphql";

export const adjustInventory = defineTool({
	name: "adjust_inventory",
	domain: "inventory",
	tier: 1,
	description:
		"Adjust inventory quantity by a delta (positive to add, negative to subtract) at a specific location. Uses the inventoryAdjustQuantities mutation.",
	scopes: ["write_inventory"],
	input: {
		inventory_item_id: z.string().describe("Shopify GID of the inventory item"),
		location_id: z.string().describe("Shopify GID of the location"),
		delta: z.number().describe("Quantity change — positive to add, negative to subtract"),
		reason: z.string().optional().describe("Reason for adjustment (e.g. 'correction', 'received')"),
	},
	handler: async (
		input: {
			inventory_item_id: string;
			location_id: string;
			delta: number;
			reason?: string;
		},
		ctx: ExecutionContext,
	) => {
		const result = await ctx.shopify.query(mutation, {
			input: {
				reason: input.reason ?? "correction",
				name: "available",
				changes: [
					{
						inventoryItemId: input.inventory_item_id,
						locationId: input.location_id,
						delta: input.delta,
					},
				],
			},
		});

		const raw = result.data ?? result;
		const payload = raw.inventoryAdjustQuantities;

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
