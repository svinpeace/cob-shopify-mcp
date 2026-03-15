import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "repeat_customer_rate",
	domain: "analytics",
	tier: 1,
	description:
		"Approximate repeat customer rate for a date range. Uses ShopifyQL customers vs orders count to estimate repeat purchasing behavior.",
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
		const ql = `FROM sales SHOW customers, orders SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const result = await executeShopifyQL(ql, ctx);
		const row = result.data[0] ?? {};

		const totalOrders = (row.orders as number) ?? 0;
		const totalCustomers = (row.customers as number) ?? 0;

		// If orders > customers, the difference represents repeat orders
		// repeatCustomers is an approximation: minimum of (orders - customers) and totalCustomers
		const estimatedRepeatCustomers = Math.min(Math.max(0, totalOrders - totalCustomers), totalCustomers);
		const repeatRate =
			totalCustomers > 0 ? Math.round((estimatedRepeatCustomers / totalCustomers) * 10000) / 100 : 0;

		return {
			totalCustomers,
			repeatCustomers: estimatedRepeatCustomers,
			repeatRate,
			totalOrders,
			note: "Repeat customer count is approximate: derived from orders vs unique customers difference",
		};
	},
});
