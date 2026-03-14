import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";

const tagsAddMutation = `mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}`;

const tagsRemoveMutation = `mutation TagsRemove($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}`;

export const manageProductTags = defineTool({
	name: "manage_product_tags",
	domain: "products",
	tier: 1,
	description: "Add or remove tags on a product. Provide arrays of tags to add and/or remove.",
	scopes: ["write_products"],
	input: {
		id: z.string(),
		add: z.array(z.string()).optional(),
		remove: z.array(z.string()).optional(),
	},
	handler: async (
		input: {
			id: string;
			add?: string[];
			remove?: string[];
		},
		ctx: ExecutionContext,
	) => {
		const results: { added?: string[]; removed?: string[] } = {};

		if (input.add && input.add.length > 0) {
			const addResult = await ctx.shopify.query(tagsAddMutation, {
				id: input.id,
				tags: input.add,
			});
			const addData = addResult.data ?? addResult;
			const addPayload = addData.tagsAdd;

			if (addPayload.userErrors?.length > 0) {
				throw new Error(`Tag add failed: ${addPayload.userErrors.map((e: any) => e.message).join("; ")}`);
			}
			results.added = input.add;
		}

		if (input.remove && input.remove.length > 0) {
			const removeResult = await ctx.shopify.query(tagsRemoveMutation, {
				id: input.id,
				tags: input.remove,
			});
			const removeData = removeResult.data ?? removeResult;
			const removePayload = removeData.tagsRemove;

			if (removePayload.userErrors?.length > 0) {
				throw new Error(`Tag remove failed: ${removePayload.userErrors.map((e: any) => e.message).join("; ")}`);
			}
			results.removed = input.remove;
		}

		return { productId: input.id, ...results };
	},
});
