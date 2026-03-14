import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./search-products.graphql";

export const searchProducts = defineTool({
	name: "search_products",
	domain: "products",
	tier: 1,
	description: "Search products by keyword query string using Shopify full-text search. Supports cursor pagination.",
	scopes: ["read_products"],
	input: {
		query: z.string(),
		limit: z.number().min(1).max(250).default(10),
		cursor: z.string().optional(),
	},
	handler: async (input: { query: string; limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			first: input.limit,
			query: input.query,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;

		return {
			products: data.products.edges.map((e: any) => ({
				...e.node,
				variants: e.node.variants?.edges?.map((v: any) => v.node) ?? [],
			})),
			pageInfo: data.products.pageInfo,
		};
	},
});
