import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "orders_by_date_range",
	domain: "analytics",
	tier: 1,
	description: "Order count and metrics grouped by day/week/month",
	scopes: ["read_reports"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		group_by: z.enum(["day", "week", "month"]).default("day").describe("Group orders by day, week, or month"),
	},
	handler: async (input: { start_date: string; end_date: string; group_by: string }, ctx: ExecutionContext) => {
		const query = `FROM sales SHOW orders, total_sales TIMESERIES ${input.group_by} SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const result = await executeShopifyQL(query, ctx);

		// The time column name matches the group_by value (day, week, or month)
		const timeColumn = input.group_by;

		const periods = result.data.map((row) => ({
			period: row[timeColumn] as string,
			orderCount: (row.orders as number) ?? 0,
			totalSales: (row.total_sales as number) ?? 0,
			currency: "USD",
		}));

		return { periods, groupBy: input.group_by };
	},
});
