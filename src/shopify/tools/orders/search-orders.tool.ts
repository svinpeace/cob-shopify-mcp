import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./search-orders.graphql";

export const searchOrders = defineTool({
	name: "search_orders",
	domain: "orders",
	tier: 1,
	description:
		"Search orders by query string (customer name, email, order number, date range). Uses Shopify's order search syntax.",
	scopes: ["read_orders"],
	input: {
		query: z.string(),
		limit: z.number().min(1).max(50).default(10),
		cursor: z.string().optional(),
	},
	handler: async (input, ctx) => {
		const result = await ctx.shopify.query(query, {
			first: input.limit,
			query: input.query,
			after: input.cursor,
		});
		const data = result.data ?? result;
		const connection = data.orders;
		return {
			orders: connection.edges.map((edge: any) => ({
				...edge.node,
				lineItems: edge.node.lineItems.edges.map((e: any) => e.node),
				fulfillments: edge.node.fulfillments,
			})),
			pageInfo: connection.pageInfo,
		};
	},
});
