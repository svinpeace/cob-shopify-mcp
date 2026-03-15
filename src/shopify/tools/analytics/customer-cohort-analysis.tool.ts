import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "customer_cohort_analysis",
	domain: "analytics",
	tier: 1,
	description: "Customer cohort analysis showing customers, orders, and sales grouped by time period",
	scopes: ["read_reports"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		group_by: z.enum(["day", "week", "month"]).default("month").describe("Time grouping for cohorts"),
	},
	handler: async (
		input: { start_date: string; end_date: string; group_by: "day" | "week" | "month" },
		ctx: ExecutionContext,
	) => {
		const query = `FROM sales SHOW customers, orders, total_sales TIMESERIES ${input.group_by} SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const result = await executeShopifyQL(query, ctx);
		const periods = result.data.map((row) => ({
			period: (row.day ?? row.week ?? row.month ?? "") as string,
			totalCustomers: (row.customers as number) ?? 0,
			orders: (row.orders as number) ?? 0,
			totalSales: (row.total_sales as number) ?? 0,
		}));
		return { periods, groupBy: input.group_by, count: periods.length };
	},
});
