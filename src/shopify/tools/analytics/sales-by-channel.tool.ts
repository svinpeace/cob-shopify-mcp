import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "sales_by_channel",
	domain: "analytics",
	tier: 1,
	description: "Revenue and orders broken down by sales channel",
	scopes: ["read_reports"],
	input: {
		start_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
			.describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
			.describe("ISO 8601 date, e.g. 2026-01-31"),
		limit: z.coerce.number().min(1).max(50).default(10).describe("Number of channels to return"),
	},
	handler: async (input: { start_date: string; end_date: string; limit: number }, ctx: ExecutionContext) => {
		const query = `FROM sales SHOW total_sales, net_sales, orders GROUP BY sales_channel SINCE ${input.start_date} UNTIL ${input.end_date} ORDER BY total_sales DESC LIMIT ${input.limit}`;
		const result = await executeShopifyQL(query, ctx);
		const channels = result.data.map((row) => ({
			channel: (row.sales_channel as string) ?? "Unknown",
			totalSales: (row.total_sales as number) ?? 0,
			netSales: (row.net_sales as number) ?? 0,
			orders: (row.orders as number) ?? 0,
		}));
		return { channels, count: channels.length };
	},
});
