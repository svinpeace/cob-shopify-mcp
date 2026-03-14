import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-product-variants.graphql";

export const listProductVariants = defineTool({
	name: "list_product_variants",
	domain: "products",
	tier: 1,
	description:
		"List all variants for a product. Returns variant details including price, SKU, inventory, and selected options.",
	scopes: ["read_products"],
	input: {
		product_id: z.string(),
		limit: z.number().min(1).max(100).default(25),
		cursor: z.string().optional(),
	},
	handler: async (input: { product_id: string; limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			id: input.product_id,
			first: input.limit,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;
		const product = data.product;

		if (!product) return { variants: [], pageInfo: { hasNextPage: false, endCursor: null } };

		return {
			productId: product.id,
			productTitle: product.title,
			variants: product.variants.edges.map((e: any) => e.node),
			pageInfo: product.variants.pageInfo,
		};
	},
});
