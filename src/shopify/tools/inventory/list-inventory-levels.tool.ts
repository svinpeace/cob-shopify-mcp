import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-inventory-levels.graphql";

export const listInventoryLevels = defineTool({
	name: "list_inventory_levels",
	domain: "inventory",
	tier: 1,
	description:
		"List inventory levels across all locations. Returns location name and available/committed/on_hand quantities. Supports cursor pagination.",
	scopes: ["read_inventory", "read_locations"],
	input: {
		limit: z.number().min(1).max(250).default(25),
		cursor: z.string().optional().describe("Pagination cursor"),
	},
	handler: async (input: { limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = { first: input.limit };
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const raw = result.data ?? result;

		const items =
			raw.inventoryItems?.edges?.map((e: any) => ({
				...e.node,
				inventoryLevels: e.node.inventoryLevels?.edges?.map((l: any) => l.node) ?? [],
			})) ?? [];

		return {
			inventoryItems: items,
			pageInfo: raw.inventoryItems?.pageInfo ?? {
				hasNextPage: false,
				endCursor: null,
			},
		};
	},
});
