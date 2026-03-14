import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./update-product.graphql";

export const updateProduct = defineTool({
	name: "update_product",
	domain: "products",
	tier: 1,
	description: "Update product fields such as title, description, vendor, product type, and status.",
	scopes: ["write_products"],
	input: {
		id: z.string(),
		title: z.string().optional(),
		description: z.string().optional(),
		vendor: z.string().optional(),
		product_type: z.string().optional(),
		status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
	},
	handler: async (
		input: {
			id: string;
			title?: string;
			description?: string;
			vendor?: string;
			product_type?: string;
			status?: string;
		},
		ctx: ExecutionContext,
	) => {
		const productInput: Record<string, unknown> = {
			id: input.id,
		};
		if (input.title !== undefined) productInput.title = input.title;
		if (input.description !== undefined) productInput.descriptionHtml = input.description;
		if (input.vendor !== undefined) productInput.vendor = input.vendor;
		if (input.product_type !== undefined) productInput.productType = input.product_type;
		if (input.status !== undefined) productInput.status = input.status;

		const result = await ctx.shopify.query(mutation, { product: productInput });
		const data = result.data ?? result;
		const payload = data.productUpdate;

		if (payload.userErrors?.length > 0) {
			throw new Error(`Product update failed: ${payload.userErrors.map((e: any) => e.message).join("; ")}`);
		}

		return { product: payload.product };
	},
});
