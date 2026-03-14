import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./add-customer-tag.graphql";

export const addCustomerTag = defineTool({
	name: "add_customer_tag",
	domain: "customers",
	tier: 1,
	description: "Add one or more tags to a customer using the tagsAdd mutation.",
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

		if (data.tagsAdd.userErrors.length > 0) {
			return {
				error: true,
				userErrors: data.tagsAdd.userErrors,
			};
		}

		return { node: data.tagsAdd.node };
	},
});
