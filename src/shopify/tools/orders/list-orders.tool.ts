import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-orders.graphql";

export const listOrders = defineTool({
	name: "list_orders",
	domain: "orders",
	tier: 1,
	description:
		"List orders with optional filtering by status, financial status, and fulfillment status. Returns order details including line items and fulfillment tracking.",
	scopes: ["read_orders"],
	input: {
		limit: z.number().min(1).max(50).default(10),
		status: z.string().optional(),
		financial_status: z.string().optional(),
		fulfillment_status: z.string().optional(),
		cursor: z.string().optional(),
	},
	handler: async (input, ctx) => {
		const parts: string[] = [];
		if (input.status) parts.push(`status:${input.status}`);
		if (input.financial_status) parts.push(`financial_status:${input.financial_status}`);
		if (input.fulfillment_status) parts.push(`fulfillment_status:${input.fulfillment_status}`);
		const queryStr = parts.length > 0 ? parts.join(" ") : undefined;

		const result = await ctx.shopify.query(query, {
			first: input.limit,
			query: queryStr,
			after: input.cursor,
		});
		const data = result.data ?? result;
		return mapOrdersResponse(data);
	},
});

function mapOrdersResponse(data: any) {
	const connection = data.orders;
	return {
		orders: connection.edges.map((edge: any) => mapOrderNode(edge.node)),
		pageInfo: connection.pageInfo,
	};
}

function mapOrderNode(node: any) {
	return {
		...node,
		lineItems: node.lineItems.edges.map((e: any) => e.node),
		fulfillments: node.fulfillments,
	};
}
