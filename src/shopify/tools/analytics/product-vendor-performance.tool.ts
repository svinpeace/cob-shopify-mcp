import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

const sortColumnMap: Record<string, string> = {
	revenue: "total_sales",
	quantity: "units_sold",
	orders: "orders",
};

export default defineTool({
	name: "product_vendor_performance",
	domain: "analytics",
	tier: 1,
	description: "Revenue, units sold, and orders broken down by product vendor",
	scopes: ["read_reports"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		limit: z.coerce.number().min(1).max(50).default(10).describe("Number of vendors to return"),
		sort_by: z
			.enum(["revenue", "quantity", "orders"])
			.default("revenue")
			.describe("Sort vendors by: revenue, quantity, or orders"),
	},
	handler: async (
		input: { start_date: string; end_date: string; limit: number; sort_by: string },
		ctx: ExecutionContext,
	) => {
		const sortColumn = sortColumnMap[input.sort_by] ?? "total_sales";
		const query = `FROM sales SHOW total_sales, units_sold, orders GROUP BY product_vendor SINCE ${input.start_date} UNTIL ${input.end_date} ORDER BY ${sortColumn} DESC LIMIT ${input.limit}`;
		const result = await executeShopifyQL(query, ctx);
		const vendors = result.data.map((row) => ({
			vendor: (row.product_vendor as string) ?? "Unknown",
			totalSales: (row.total_sales as number) ?? 0,
			unitsSold: (row.units_sold as number) ?? 0,
			orders: (row.orders as number) ?? 0,
		}));
		return { vendors, count: vendors.length };
	},
});
