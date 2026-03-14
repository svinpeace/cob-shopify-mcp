import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./orders-by-date-range.graphql";

function getGroupKey(dateStr: string, groupBy: string): string {
	const date = new Date(dateStr);
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");

	switch (groupBy) {
		case "month":
			return `${year}-${month}`;
		case "week": {
			// ISO week: find Monday of the week
			const d = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
			const dayOfWeek = d.getUTCDay() || 7; // Sunday = 7
			d.setUTCDate(d.getUTCDate() - dayOfWeek + 1); // Monday
			const wy = d.getUTCFullYear();
			const wm = String(d.getUTCMonth() + 1).padStart(2, "0");
			const wd = String(d.getUTCDate()).padStart(2, "0");
			return `${wy}-${wm}-${wd}`;
		}
		default:
			return `${year}-${month}-${day}`;
	}
}

export default defineTool({
	name: "orders_by_date_range",
	domain: "analytics",
	tier: 1,
	description: "Order count and metrics grouped by day/week/month",
	scopes: ["read_orders"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		group_by: z.enum(["day", "week", "month"]).default("day").describe("Group orders by day, week, or month"),
	},
	handler: async (input: { start_date: string; end_date: string; group_by: string }, ctx: ExecutionContext) => {
		const groups = new Map<string, { orderCount: number; totalSales: number; currency: string }>();
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
				const key = getGroupKey(order.createdAt, input.group_by);
				const amount = Number.parseFloat(order.totalPriceSet?.shopMoney?.amount ?? "0");
				const currency = order.totalPriceSet?.shopMoney?.currencyCode ?? "USD";

				const existing = groups.get(key);
				if (existing) {
					existing.orderCount++;
					existing.totalSales += amount;
				} else {
					groups.set(key, { orderCount: 1, totalSales: amount, currency });
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		const periods = Array.from(groups.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([period, data]) => ({
				period,
				orderCount: data.orderCount,
				totalSales: Math.round(data.totalSales * 100) / 100,
				currency: data.currency,
			}));

		return { periods, groupBy: input.group_by };
	},
});
