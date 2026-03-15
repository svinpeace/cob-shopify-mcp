import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "sales_comparison",
	domain: "analytics",
	tier: 1,
	description:
		"Compare sales metrics across time periods using ShopifyQL COMPARE TO. Returns current and comparison period data with percent changes — ideal for period-over-period analysis.",
	scopes: ["read_reports"],
	input: {
		start_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
			.describe("ISO 8601 date for the start of the period, e.g. 2026-01-01"),
		end_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
			.describe("ISO 8601 date for the end of the period, e.g. 2026-01-31"),
		compare_to: z
			.enum(["previous_period", "previous_year"])
			.default("previous_period")
			.describe("Compare against the previous period of equal length, or the same period last year"),
		group_by: z
			.enum(["day", "week", "month"])
			.default("month")
			.describe("Time granularity for the comparison breakdown"),
	},
	handler: async (
		input: { start_date: string; end_date: string; compare_to: string; group_by: string },
		ctx: ExecutionContext,
	) => {
		const query = `FROM sales SHOW total_sales, orders, net_sales TIMESERIES ${input.group_by} SINCE ${input.start_date} UNTIL ${input.end_date} COMPARE TO ${input.compare_to}`;
		const result = await executeShopifyQL(query, ctx);

		// ShopifyQL COMPARE TO returns dynamic column names — pass through all columns per row
		const periods = result.data.map((row) => {
			const period: Record<string, string | number | null> = {};
			for (const col of result.columns) {
				period[col.name] = row[col.name] ?? null;
			}
			return period;
		});

		return { periods, compareTo: input.compare_to, count: periods.length };
	},
});
