import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./repeat-customer-rate.graphql";

export default defineTool({
	name: "repeat_customer_rate",
	domain: "analytics",
	tier: 1,
	description: "Percentage of orders from repeat customers in a date range",
	scopes: ["read_orders", "read_customers"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
	},
	handler: async (input: { start_date: string; end_date: string }, ctx: ExecutionContext) => {
		const customerOrders = new Map<string, number>();
		let hasNextPage = true;
		let after: string | null = null;

		while (hasNextPage) {
			const data = await ctx.shopify.query(query, {
				first: 250,
				query: `created_at:>=${input.start_date} created_at:<=${input.end_date}`,
				...(after ? { after } : {}),
			});

			const orders = data.data?.orders?.edges?.map((e: any) => e.node) ?? [];
			for (const order of orders) {
				const customerId = order.customer?.id;
				if (customerId) {
					customerOrders.set(customerId, (customerOrders.get(customerId) ?? 0) + 1);
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		const totalCustomers = customerOrders.size;
		let repeatCustomers = 0;
		let totalRepeatOrders = 0;

		for (const count of customerOrders.values()) {
			if (count > 1) {
				repeatCustomers++;
				totalRepeatOrders += count;
			}
		}

		const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100 : 0;
		const averageOrdersPerRepeatCustomer =
			repeatCustomers > 0 ? Math.round((totalRepeatOrders / repeatCustomers) * 100) / 100 : 0;

		return { totalCustomers, repeatCustomers, repeatRate, averageOrdersPerRepeatCustomer };
	},
});
