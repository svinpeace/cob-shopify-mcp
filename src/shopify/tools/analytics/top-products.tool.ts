import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./top-products.graphql";

interface ProductAgg {
	productId: string;
	productTitle: string;
	totalRevenue: number;
	totalQuantity: number;
	orderCount: number;
}

export default defineTool({
	name: "top_products",
	domain: "analytics",
	tier: 1,
	description: "Best-selling products by revenue or quantity in a date range",
	scopes: ["read_orders", "read_products"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		sort_by: z.enum(["revenue", "quantity"]).default("revenue").describe("Sort by revenue or quantity"),
		limit: z.number().min(1).max(50).default(10).describe("Number of products to return"),
	},
	handler: async (
		input: { start_date: string; end_date: string; sort_by: string; limit: number },
		ctx: ExecutionContext,
	) => {
		const productMap = new Map<string, ProductAgg>();
		let hasNextPage = true;
		let after: string | null = null;

		while (hasNextPage) {
			const data = await ctx.shopify.query(query, {
				first: 250,
				query: `created_at:>=${input.start_date} created_at:<=${input.end_date}`,
				...(after ? { after } : {}),
			});

			const orders = data.data?.orders?.edges?.map((e: any) => e.node) ?? [];
			const orderProductIds = new Set<string>();

			for (const order of orders) {
				orderProductIds.clear();
				const lineItems = order.lineItems?.edges?.map((e: any) => e.node) ?? [];
				for (const item of lineItems) {
					const productId = item.product?.id ?? "unknown";
					const productTitle = item.product?.title ?? item.title ?? "Unknown Product";
					const revenue = Number.parseFloat(item.originalTotalSet?.shopMoney?.amount ?? "0");
					const quantity = item.quantity ?? 0;

					const existing = productMap.get(productId);
					if (existing) {
						existing.totalRevenue += revenue;
						existing.totalQuantity += quantity;
						if (!orderProductIds.has(productId)) {
							existing.orderCount++;
						}
					} else {
						productMap.set(productId, {
							productId,
							productTitle,
							totalRevenue: revenue,
							totalQuantity: quantity,
							orderCount: 1,
						});
					}
					orderProductIds.add(productId);
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		const products = Array.from(productMap.values())
			.sort((a, b) => {
				if (input.sort_by === "quantity") {
					return b.totalQuantity - a.totalQuantity;
				}
				return b.totalRevenue - a.totalRevenue;
			})
			.slice(0, input.limit)
			.map((p) => ({
				productId: p.productId,
				productTitle: p.productTitle,
				totalRevenue: Math.round(p.totalRevenue * 100) / 100,
				totalQuantity: p.totalQuantity,
				orderCount: p.orderCount,
			}));

		return { products, count: products.length };
	},
});
