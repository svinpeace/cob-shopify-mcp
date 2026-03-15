import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "conversion_funnel",
	domain: "analytics",
	tier: 1,
	description:
		"Conversion funnel metrics: view sessions, cart, checkout, purchase sessions from product analytics, plus total orders from sales",
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
		const [salesResult, productsResult] = await Promise.all([
			executeShopifyQL(`FROM sales SHOW orders SINCE ${input.start_date} UNTIL ${input.end_date}`, ctx),
			executeShopifyQL(
				`FROM products SHOW view_sessions, cart_sessions, checkout_sessions, purchase_sessions SINCE ${input.start_date} UNTIL ${input.end_date}`,
				ctx,
			),
		]);

		const orders = (salesResult.data[0]?.orders as number) ?? 0;
		const productRow = productsResult.data[0] ?? {};
		const viewSessions = (productRow.view_sessions as number) ?? 0;
		const cartSessions = (productRow.cart_sessions as number) ?? 0;
		const checkoutSessions = (productRow.checkout_sessions as number) ?? 0;
		const purchaseSessions = (productRow.purchase_sessions as number) ?? 0;

		const conversionRate = viewSessions > 0 ? Math.round((purchaseSessions / viewSessions) * 10000) / 100 : 0;
		const cartRate = viewSessions > 0 ? Math.round((cartSessions / viewSessions) * 10000) / 100 : 0;
		const checkoutRate = cartSessions > 0 ? Math.round((checkoutSessions / cartSessions) * 10000) / 100 : 0;

		return {
			viewSessions,
			cartSessions,
			checkoutSessions,
			purchaseSessions,
			orders,
			conversionRate,
			cartRate,
			checkoutRate,
		};
	},
});
