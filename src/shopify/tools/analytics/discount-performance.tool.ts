import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "discount_performance",
	domain: "analytics",
	tier: 1,
	description:
		"Analyze discount impact on sales: discounted vs total revenue, discount percentage, and total discount amount",
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
	},
	handler: async (input: { start_date: string; end_date: string }, ctx: ExecutionContext) => {
		const allSalesQuery = `FROM sales SHOW total_sales, orders, discounts SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const allResult = await executeShopifyQL(allSalesQuery, ctx);
		const allRow = allResult.data[0] ?? {};
		const allSales = {
			totalSales: (allRow.total_sales as number) ?? 0,
			orders: (allRow.orders as number) ?? 0,
		};
		const discountImpact = (allRow.discounts as number) ?? 0;

		let discountedSales = { totalSales: 0, orders: 0, totalDiscounts: 0 };

		try {
			const discountedQuery = `FROM sales SHOW total_sales, orders, discounts WHERE is_discounted_sale = true SINCE ${input.start_date} UNTIL ${input.end_date}`;
			const discountedResult = await executeShopifyQL(discountedQuery, ctx);
			const discRow = discountedResult.data[0] ?? {};
			discountedSales = {
				totalSales: (discRow.total_sales as number) ?? 0,
				orders: (discRow.orders as number) ?? 0,
				totalDiscounts: (discRow.discounts as number) ?? 0,
			};
		} catch (_err) {
			// is_discounted_sale may not be supported; fall back to all-sales discounts
			discountedSales = {
				totalSales: 0,
				orders: 0,
				totalDiscounts: Math.abs(discountImpact),
			};
		}

		const discountedPercentage =
			allSales.totalSales !== 0 ? (discountedSales.totalSales / allSales.totalSales) * 100 : 0;

		return {
			discountedSales,
			allSales,
			discountedPercentage: Math.round(discountedPercentage * 100) / 100,
			discountImpact: Math.abs(discountImpact),
		};
	},
});
