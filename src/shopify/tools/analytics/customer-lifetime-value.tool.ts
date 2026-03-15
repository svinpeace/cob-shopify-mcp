import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "customer_lifetime_value",
	domain: "analytics",
	tier: 1,
	description:
		"Customer lifetime value report showing top customers by spend or order count. Note: groups by customer_name which may not be unique across customers with the same name.",
	scopes: ["read_reports"],
	input: {
		limit: z.coerce.number().min(1).max(100).default(25).describe("Number of customers to return"),
		sort_by: z.enum(["amount", "orders"]).default("amount").describe("Sort by total spend or order count"),
	},
	handler: async (input: { limit: number; sort_by: "amount" | "orders" }, ctx: ExecutionContext) => {
		// Use sales table grouped by customer — more reliable than customers table
		const sortColumn = input.sort_by === "amount" ? "total_sales" : "orders";
		const query = `FROM sales SHOW total_sales, orders GROUP BY customer_name ORDER BY ${sortColumn} DESC LIMIT ${input.limit}`;
		const result = await executeShopifyQL(query, ctx);
		const customers = result.data.map((row) => {
			const totalOrders = (row.orders as number) ?? 0;
			const totalAmountSpent = (row.total_sales as number) ?? 0;
			return {
				customer: (row.customer_name as string) ?? "Unknown",
				totalOrders,
				totalAmountSpent,
				averageOrderValue: totalOrders > 0 ? Math.round((totalAmountSpent / totalOrders) * 100) / 100 : 0,
			};
		});
		return { customers, count: customers.length };
	},
});
