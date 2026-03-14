import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./sales-summary.graphql";

export default defineTool({
	name: "sales_summary",
	domain: "analytics",
	tier: 1,
	description: "Sales total/average by date range",
	scopes: ["read_orders"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
	},
	handler: async (input: { start_date: string; end_date: string }, ctx: ExecutionContext) => {
		let totalSales = 0;
		let orderCount = 0;
		let currency = "USD";
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
				const amount = Number.parseFloat(order.totalPriceSet?.shopMoney?.amount ?? "0");
				totalSales += amount;
				orderCount++;
				if (order.totalPriceSet?.shopMoney?.currencyCode) {
					currency = order.totalPriceSet.shopMoney.currencyCode;
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		const averageOrderValue = orderCount > 0 ? Math.round((totalSales / orderCount) * 100) / 100 : 0;
		totalSales = Math.round(totalSales * 100) / 100;

		return { totalSales, orderCount, averageOrderValue, currency };
	},
});
