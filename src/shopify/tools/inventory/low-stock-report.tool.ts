import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./low-stock-report.graphql";

export const lowStockReport = defineTool({
	name: "low_stock_report",
	domain: "inventory",
	tier: 1,
	description:
		"Get a report of inventory items below a specified stock threshold. Queries all inventory, filters items with available quantity below threshold, and returns a sorted list with product name, variant title, SKU, available quantity, and location.",
	scopes: ["read_inventory", "read_products", "read_locations"],
	input: {
		threshold: z
			.number()
			.min(0)
			.default(10)
			.describe("Stock threshold — items with available quantity below this are included"),
		limit: z.number().min(1).max(100).default(25).describe("Maximum number of low-stock items to return"),
	},
	handler: async (input: { threshold: number; limit: number }, ctx: ExecutionContext) => {
		const lowStockItems: Array<{
			productTitle: string;
			variantTitle: string;
			sku: string;
			available: number;
			location: string;
		}> = [];

		let hasNextPage = true;
		let cursor: string | undefined;
		const pageSize = 50;

		while (hasNextPage && lowStockItems.length < input.limit) {
			const variables: Record<string, unknown> = { first: pageSize };
			if (cursor) variables.after = cursor;

			const result = await ctx.shopify.query(query, variables);
			const raw = result.data ?? result;
			const edges = raw.inventoryItems?.edges ?? [];

			for (const edge of edges) {
				const item = edge.node;
				const levels = item.inventoryLevels?.edges ?? [];

				for (const levelEdge of levels) {
					const level = levelEdge.node;
					const availableQty = level.quantities?.find((q: any) => q.name === "available");
					const available = availableQty?.quantity ?? 0;

					if (available < input.threshold) {
						const variant = item.variants?.nodes?.[0];
						lowStockItems.push({
							productTitle: variant?.product?.title ?? "Unknown",
							variantTitle: variant?.title ?? "Default",
							sku: item.sku ?? "",
							available,
							location: level.location?.name ?? "Unknown",
						});
					}
				}
			}

			const pageInfo = raw.inventoryItems?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			cursor = pageInfo?.endCursor;
		}

		// Sort by available quantity ascending (lowest stock first)
		lowStockItems.sort((a, b) => a.available - b.available);

		// Trim to requested limit
		const trimmed = lowStockItems.slice(0, input.limit);

		return {
			count: trimmed.length,
			threshold: input.threshold,
			items: trimmed,
		};
	},
});
