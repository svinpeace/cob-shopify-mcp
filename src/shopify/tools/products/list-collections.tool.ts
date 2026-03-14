import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-collections.graphql";

export const listCollections = defineTool({
	name: "list_collections",
	domain: "products",
	tier: 1,
	description: "List collections with cursor pagination. Returns collection title, handle, products count, and image.",
	scopes: ["read_products"],
	input: {
		limit: z.number().min(1).max(250).default(10),
		cursor: z.string().optional(),
	},
	handler: async (input: { limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			first: input.limit,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;

		return {
			collections: data.collections.edges.map((e: any) => e.node),
			pageInfo: data.collections.pageInfo,
		};
	},
});
