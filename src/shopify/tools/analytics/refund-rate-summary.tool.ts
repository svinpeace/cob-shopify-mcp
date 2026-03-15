import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "refund_rate_summary",
	domain: "analytics",
	tier: 1,
	description:
		"Refund summary for a date range using returned product quantities and estimated refund amounts (values in shop currency)",
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
		const query = `FROM orders SHOW orders, returned_product_quantity, gross_sales, net_sales, discounts SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const result = await executeShopifyQL(query, ctx);

		const row = result.data[0] ?? {};
		const totalOrders = (row.orders as number) ?? 0;
		const returnedItems = (row.returned_product_quantity as number) ?? 0;
		const grossSales = (row.gross_sales as number) ?? 0;
		const netSales = (row.net_sales as number) ?? 0;
		const discounts = (row.discounts as number) ?? 0;
		// Refund amount = gross_sales - net_sales - abs(discounts)
		// gross_sales - net_sales includes both discounts and refunds, so we subtract discounts
		const totalRefundAmount = Math.round(Math.max(0, grossSales - netSales - Math.abs(discounts)) * 100) / 100;
		const refundRate = totalOrders > 0 ? Math.round((returnedItems / totalOrders) * 10000) / 100 : 0;

		return { totalOrders, returnedItems, refundRate, totalRefundAmount };
	},
});
