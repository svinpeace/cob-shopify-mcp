import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-products.graphql";

export const listProducts = defineTool({
	name: "list_products",
	domain: "products",
	tier: 1,
	description: "List products with optional filtering by status, vendor, and product type. Supports cursor pagination.",
	scopes: ["read_products"],
	outputFields: [
		"id",
		"title",
		"handle",
		"status",
		"vendor",
		"productType",
		"totalInventory",
		"featuredMedia",
		"variants",
		"pageInfo",
	],
	input: {
		limit: z.number().min(1).max(250).default(10),
		status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
		vendor: z.string().optional(),
		product_type: z.string().optional(),
		cursor: z.string().optional(),
	},
	handler: async (
		input: {
			limit: number;
			status?: string;
			vendor?: string;
			product_type?: string;
			cursor?: string;
		},
		ctx: ExecutionContext,
	) => {
		const queryParts: string[] = [];
		if (input.status) queryParts.push(`status:${input.status}`);
		if (input.vendor) queryParts.push(`vendor:'${input.vendor}'`);
		if (input.product_type) queryParts.push(`product_type:'${input.product_type}'`);

		const variables: Record<string, unknown> = {
			first: input.limit,
		};
		if (queryParts.length > 0) variables.query = queryParts.join(" AND ");
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;

		return {
			products: data.products.edges.map((e: any) => ({
				...e.node,
				variants: e.node.variants?.edges?.map((v: any) => v.node) ?? [],
			})),
			pageInfo: data.products.pageInfo,
		};
	},
});
