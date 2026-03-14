import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-location-inventory.graphql";

export const getLocationInventory = defineTool({
	name: "get_location_inventory",
	domain: "inventory",
	tier: 1,
	description:
		"Get all inventory items at a specific location. Returns items with SKU, available, and incoming quantities.",
	scopes: ["read_inventory", "read_locations"],
	input: {
		location_id: z.string().describe("Shopify GID of the location"),
		limit: z.number().min(1).max(250).default(25),
		cursor: z.string().optional().describe("Pagination cursor"),
	},
	handler: async (input: { location_id: string; limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			id: input.location_id,
			first: input.limit,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const raw = result.data ?? result;
		const location = raw.location;

		if (!location) {
			return {
				location: null,
				inventoryLevels: [],
				pageInfo: { hasNextPage: false, endCursor: null },
			};
		}

		const levels = location.inventoryLevels?.edges?.map((e: any) => e.node) ?? [];

		return {
			location: { id: location.id, name: location.name },
			inventoryLevels: levels,
			pageInfo: location.inventoryLevels?.pageInfo ?? {
				hasNextPage: false,
				endCursor: null,
			},
		};
	},
});
