import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";
import query from "./repeat-customer-rate.graphql";

/**
 * Attempts ShopifyQL first (single query, no pagination).
 * Falls back to cursor-based pagination if ShopifyQL `customers` metric
 * is unavailable for the `sales` table.
 */
export default defineTool({
	name: "repeat_customer_rate",
	domain: "analytics",
	tier: 1,
	description: "Percentage of orders from repeat customers in a date range",
	scopes: ["read_reports", "read_orders", "read_customers"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
	},
	handler: async (input: { start_date: string; end_date: string }, ctx: ExecutionContext) => {
		// PRIMARY: try ShopifyQL from sales table
		try {
			return await shopifyqlApproach(input, ctx);
		} catch {
			// FALLBACK: cursor-based pagination
			return await paginationFallback(input, ctx);
		}
	},
});

async function shopifyqlApproach(input: { start_date: string; end_date: string }, ctx: ExecutionContext) {
	const ql = `FROM sales SHOW orders, customers, returning_customers SINCE ${input.start_date} UNTIL ${input.end_date}`;
	const result = await executeShopifyQL(ql, ctx);
	const row = result.data[0] ?? {};

	const totalOrders = (row.orders as number) ?? 0;
	const totalCustomers = (row.customers as number) ?? 0;
	const returningCustomers = (row.returning_customers as number | undefined) ?? null;

	if (returningCustomers !== null) {
		// ShopifyQL provides returning_customers directly
		const repeatRate = totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 10000) / 100 : 0;
		const averageOrdersPerRepeatCustomer =
			returningCustomers > 0 && totalCustomers > 0
				? Math.round(((totalOrders - (totalCustomers - returningCustomers)) / returningCustomers) * 100) / 100
				: 0;

		return { totalCustomers, repeatCustomers: returningCustomers, repeatRate, averageOrdersPerRepeatCustomer };
	}

	// ShopifyQL returned customers + orders but no returning_customers
	// We can estimate: if orders > customers, some are repeat
	const estimatedRepeatCustomers = Math.max(0, totalOrders - totalCustomers);
	const repeatCustomers = Math.min(estimatedRepeatCustomers, totalCustomers);
	const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 10000) / 100 : 0;

	return {
		totalCustomers,
		repeatCustomers,
		repeatRate,
		averageOrdersPerRepeatCustomer: null as number | null,
	};
}

async function paginationFallback(input: { start_date: string; end_date: string }, ctx: ExecutionContext) {
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
}
