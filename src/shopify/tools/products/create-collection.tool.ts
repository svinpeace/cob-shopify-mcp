import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./create-collection.graphql";

export const createCollection = defineTool({
	name: "create_collection",
	domain: "products",
	tier: 1,
	description: "Create a new collection with title and optional description.",
	scopes: ["write_products"],
	input: {
		title: z.string(),
		description: z.string().optional(),
		collection_type: z.enum(["manual", "smart"]).optional(),
	},
	handler: async (
		input: {
			title: string;
			description?: string;
			collection_type?: string;
		},
		ctx: ExecutionContext,
	) => {
		const collectionInput: Record<string, unknown> = {
			title: input.title,
		};
		if (input.description !== undefined) collectionInput.descriptionHtml = input.description;

		const result = await ctx.shopify.query(mutation, { input: collectionInput });
		const data = result.data ?? result;
		const payload = data.collectionCreate;

		if (payload.userErrors?.length > 0) {
			throw new Error(`Collection creation failed: ${payload.userErrors.map((e: any) => e.message).join("; ")}`);
		}

		return { collection: payload.collection };
	},
});
