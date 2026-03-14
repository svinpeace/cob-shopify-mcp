import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./search-customers.graphql";

export const searchCustomers = defineTool({
	name: "search_customers",
	domain: "customers",
	tier: 1,
	description: "Search customers by email, name, phone, or tag. Uses the Shopify customers(query:) filter syntax.",
	scopes: ["read_customers"],
	input: {
		query: z.string(),
		limit: z.number().min(1).max(250).default(10),
		cursor: z.string().optional(),
	},
	handler: async (input: { query: string; limit: number; cursor?: string }, ctx: ExecutionContext) => {
		const variables: Record<string, unknown> = {
			first: input.limit,
			query: input.query,
		};
		if (input.cursor) variables.after = input.cursor;

		const result = await ctx.shopify.query(query, variables);
		const data = result.data ?? result;

		return {
			customers: data.customers.edges.map((e: any) => {
				const node = e.node;
				return {
					...node,
					email: node.defaultEmailAddress?.emailAddress ?? null,
					phone: node.defaultPhoneNumber?.phoneNumber ?? null,
					defaultEmailAddress: undefined,
					defaultPhoneNumber: undefined,
				};
			}),
			pageInfo: data.customers.pageInfo,
		};
	},
});
