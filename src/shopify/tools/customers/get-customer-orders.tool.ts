import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-customer-orders.graphql";

export const getCustomerOrders = defineTool({
	name: "get_customer_orders",
	domain: "customers",
	tier: 1,
	description:
		"List orders for a specific customer. Returns order summary with name, totalPrice, status, and createdAt.",
	scopes: ["read_customers"],
	input: {
		customer_id: z.string(),
		limit: z.number().min(1).max(250).default(10),
		cursor: z.string().optional(),
	},
	handler: async (input: { customer_id: string; limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			id: input.customer_id,
			first: input.limit,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;

		return {
			customer: {
				id: data.customer.id,
				displayName: data.customer.displayName,
			},
			orders: data.customer.orders.edges.map((e: any) => e.node),
			pageInfo: data.customer.orders.pageInfo,
		};
	},
});
