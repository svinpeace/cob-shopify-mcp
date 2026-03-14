import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./remove-customer-tag.graphql";

export const removeCustomerTag = defineTool({
	name: "remove_customer_tag",
	domain: "customers",
	tier: 1,
	description: "Remove one or more tags from a customer using the tagsRemove mutation.",
	scopes: ["write_customers"],
	input: {
		id: z.string(),
		tags: z.array(z.string()).min(1),
	},
	handler: async (input: { id: string; tags: string[] }, ctx: ExecutionContext) => {
		const result = await ctx.shopify.query(mutation, {
			id: input.id,
			tags: input.tags,
		});
		const data = result.data ?? result;

		if (data.tagsRemove.userErrors.length > 0) {
			return {
				error: true,
				userErrors: data.tagsRemove.userErrors,
			};
		}

		return { node: data.tagsRemove.node };
	},
});
