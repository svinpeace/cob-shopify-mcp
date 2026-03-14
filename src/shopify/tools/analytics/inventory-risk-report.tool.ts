import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import inventoryQuery from "./inventory-risk-report.graphql";

const SALES_LOOKBACK_DAYS = 30;

export default defineTool({
	name: "inventory_risk_report",
	domain: "analytics",
	tier: 1,
	description: "Products at overstock or understock risk based on sales velocity",
	scopes: ["read_inventory", "read_products"],
	input: {
		days_of_stock_threshold: z.number().min(1).default(30).describe("Days of stock threshold for risk classification"),
		limit: z.number().min(1).max(100).default(25).describe("Number of items to return"),
	},
	handler: async (input: { days_of_stock_threshold: number; limit: number }, ctx: ExecutionContext) => {
		// Step 1: Fetch inventory levels
		interface VariantInfo {
			variantId: string;
			variantTitle: string;
			sku: string;
			inventoryQuantity: number;
			productId: string;
			productTitle: string;
		}
		const variants: VariantInfo[] = [];
		let hasNextPage = true;
		let after: string | null = null;

		while (hasNextPage) {
			const data = await ctx.shopify.query(inventoryQuery, {
				first: 250,
				...(after ? { after } : {}),
			});

			const edges = data.data?.productVariants?.edges ?? [];
			for (const edge of edges) {
				const node = edge.node;
				variants.push({
					variantId: node.id,
					variantTitle: node.title,
					sku: node.sku ?? "",
					inventoryQuantity: node.inventoryQuantity ?? 0,
					productId: node.product?.id ?? "",
					productTitle: node.product?.title ?? "Unknown Product",
				});
			}

			const pageInfo = data.data?.productVariants?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		// Step 2: Fetch recent sales for velocity calculation
		const now = new Date();
		const lookbackDate = new Date(now.getTime() - SALES_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
		const startDate = lookbackDate.toISOString().split("T")[0];
		const endDate = now.toISOString().split("T")[0];

		const salesVelocity = new Map<string, number>(); // variantId -> units sold in lookback
		hasNextPage = true;
		after = null;

		const salesQuery = `query RecentSales($first: Int!, $query: String, $after: String) {
  orders(first: $first, query: $query, after: $after) {
    edges {
      node {
        lineItems(first: 50) {
          edges {
            node {
              quantity
              variant {
                id
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}`;

		while (hasNextPage) {
			const data = await ctx.shopify.query(salesQuery, {
				first: 250,
				query: `created_at:>=${startDate} created_at:<=${endDate}`,
				...(after ? { after } : {}),
			});

			const orders = data.data?.orders?.edges?.map((e: any) => e.node) ?? [];
			for (const order of orders) {
				const lineItems = order.lineItems?.edges?.map((e: any) => e.node) ?? [];
				for (const item of lineItems) {
					const variantId = item.variant?.id;
					if (variantId) {
						salesVelocity.set(variantId, (salesVelocity.get(variantId) ?? 0) + (item.quantity ?? 0));
					}
				}
			}

			const pageInfo = data.data?.orders?.pageInfo;
			hasNextPage = pageInfo?.hasNextPage ?? false;
			after = pageInfo?.endCursor ?? null;
		}

		// Step 3: Classify risk
		const items = variants.map((v) => {
			const unitsSold = salesVelocity.get(v.variantId) ?? 0;
			const dailyVelocity = unitsSold / SALES_LOOKBACK_DAYS;
			const daysOfStock =
				dailyVelocity > 0
					? v.inventoryQuantity / dailyVelocity
					: v.inventoryQuantity > 0
						? Number.POSITIVE_INFINITY
						: 0;

			let riskCategory: "overstock" | "understock" | "healthy";
			if (daysOfStock === 0 && v.inventoryQuantity === 0) {
				riskCategory = "understock";
			} else if (daysOfStock < input.days_of_stock_threshold) {
				riskCategory = "understock";
			} else if (daysOfStock > input.days_of_stock_threshold * 3) {
				riskCategory = "overstock";
			} else {
				riskCategory = "healthy";
			}

			return {
				variantId: v.variantId,
				variantTitle: v.variantTitle,
				sku: v.sku,
				productId: v.productId,
				productTitle: v.productTitle,
				inventoryQuantity: v.inventoryQuantity,
				unitsSoldLast30Days: unitsSold,
				dailyVelocity: Math.round(dailyVelocity * 100) / 100,
				estimatedDaysOfStock: daysOfStock === Number.POSITIVE_INFINITY ? null : Math.round(daysOfStock),
				riskCategory,
			};
		});

		// Sort: understock first, then overstock, then healthy
		const riskOrder = { understock: 0, overstock: 1, healthy: 2 };
		items.sort((a, b) => riskOrder[a.riskCategory] - riskOrder[b.riskCategory]);

		const limited = items.slice(0, input.limit);
		const summary = {
			totalVariants: variants.length,
			understock: items.filter((i) => i.riskCategory === "understock").length,
			overstock: items.filter((i) => i.riskCategory === "overstock").length,
			healthy: items.filter((i) => i.riskCategory === "healthy").length,
		};

		return { items: limited, summary };
	},
});
