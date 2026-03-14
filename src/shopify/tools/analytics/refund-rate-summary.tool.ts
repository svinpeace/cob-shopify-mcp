import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./refund-rate-summary.graphql";

export default defineTool({
	name: "refund_rate_summary",
	domain: "analytics",
	tier: 1,
	description: "Refund percentage and totals for a date range",
	scopes: ["read_orders"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
	},
	handler: async (input: { start_date: string; end_date: string }, ctx: ExecutionContext) => {
		let totalOrders = 0;
		let refundedOrders = 0;
		let totalRefundAmount = 0;
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
				totalOrders++;
				if (order.totalPriceSet?.shopMoney?.currencyCode) {
					currency = order.totalPriceSet.shopMoney.currencyCode;
				}

				const refunds = order.refunds ?? [];
				if (refunds.length > 0) {
					refundedOrders++;
					for (const refund of refunds) {
						const amount = Number.parseFloat(refund.totalRefundedSet?.shopMoney?.amount ?? "0");
						totalRefundAmount += amount;
					}
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		const refundRate = totalOrders > 0 ? Math.round((refundedOrders / totalOrders) * 10000) / 100 : 0;
		totalRefundAmount = Math.round(totalRefundAmount * 100) / 100;

		return { totalOrders, refundedOrders, refundRate, totalRefundAmount, currency };
	},
});
