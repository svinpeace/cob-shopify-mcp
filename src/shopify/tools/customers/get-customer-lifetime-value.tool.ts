import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-customer-lifetime-value.graphql";

export const getCustomerLifetimeValue = defineTool({
	name: "get_customer_lifetime_value",
	domain: "customers",
	tier: 1,
	description:
		"Get customer lifetime value: totalSpent, ordersCount, computed avgOrderValue, and first/last order dates.",
	scopes: ["read_customers"],
	input: {
		customer_id: z.string(),
	},
	handler: async (input: { customer_id: string }, ctx: ExecutionContext) => {
		const result = await ctx.shopify.query(query, { id: input.customer_id });
		const data = result.data ?? result;
		const customer = data.customer;

		const totalSpent = Number.parseFloat(customer.amountSpent.amount);
		const ordersCount = customer.numberOfOrders;
		const avgOrderValue = ordersCount > 0 ? Math.round((totalSpent / ordersCount) * 100) / 100 : 0;

		const firstOrderDate = customer.firstOrder.edges[0]?.node.createdAt ?? null;
		const lastOrderDate = customer.lastOrder.edges[0]?.node.createdAt ?? null;

		return {
			customer: {
				id: customer.id,
				displayName: customer.displayName,
				email: customer.defaultEmailAddress?.emailAddress ?? null,
			},
			lifetimeValue: {
				totalSpent: customer.amountSpent,
				ordersCount,
				avgOrderValue,
				currency: customer.amountSpent.currencyCode,
				firstOrderDate,
				lastOrderDate,
			},
		};
	},
});
