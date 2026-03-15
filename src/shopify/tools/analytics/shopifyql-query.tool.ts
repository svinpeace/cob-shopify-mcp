import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "shopifyql_query",
	domain: "analytics",
	tier: 2,
	description: "Execute a raw ShopifyQL query (disabled by default, enable in config)",
	scopes: ["read_reports"],
	input: {
		query: z
			.string()
			.describe('ShopifyQL query string, e.g. FROM sales SHOW total_sales SINCE -30d'),
	},
	handler: async (input: { query: string }, ctx: ExecutionContext) => {
		const trimmed = input.query.trim();
		if (!/^from\s/i.test(trimmed)) {
			throw new Error("ShopifyQL query must start with FROM");
		}
		const result = await executeShopifyQL(trimmed, ctx);
		return { data: result.data, columns: result.columns };
	},
});
