import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./list-customers.graphql";

export const listCustomers = defineTool({
	name: "list_customers",
	domain: "customers",
	tier: 1,
	description:
		"List customers with cursor pagination. Returns displayName, email, ordersCount, totalSpent, tags, and state.",
	scopes: ["read_customers"],
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
