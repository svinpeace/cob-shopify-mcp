import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-order-by-name.graphql";

export const getOrderByName = defineTool({
	name: "get_order_by_name",
	domain: "orders",
	tier: 1,
	description: 'Get an order by its order number (e.g., "#1001"). Uses Shopify order search by name.',
	scopes: ["read_orders"],
	input: {
		name: z.string(),
	},
	handler: async (input, ctx) => {
		const orderName = input.name.startsWith("#") ? input.name : `#${input.name}`;
		const result = await ctx.shopify.query(query, {
			query: `name:${orderName}`,
		});
		const data = result.data ?? result;
		const edge = data.orders.edges[0];
		if (!edge) return { order: null };
		const order = edge.node;
		return {
			order: {
				...order,
				lineItems: order.lineItems.edges.map((e: any) => e.node),
			},
		};
	},
});
