import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./create-product.graphql";

export const createProduct = defineTool({
	name: "create_product",
	domain: "products",
	tier: 1,
	description: "Create a new product with title, description, vendor, product type, status, and tags.",
	scopes: ["write_products"],
	input: {
		title: z.string(),
		description: z.string().optional(),
		vendor: z.string().optional(),
		product_type: z.string().optional(),
		status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
		tags: z.array(z.string()).optional(),
	},
	handler: async (
		input: {
			title: string;
			description?: string;
			vendor?: string;
			product_type?: string;
			status?: string;
			tags?: string[];
		},
		ctx: ExecutionContext,
	) => {
		const productInput: Record<string, unknown> = {
			title: input.title,
		};
		if (input.description !== undefined) productInput.descriptionHtml = input.description;
		if (input.vendor !== undefined) productInput.vendor = input.vendor;
		if (input.product_type !== undefined) productInput.productType = input.product_type;
		if (input.status !== undefined) productInput.status = input.status;
		if (input.tags !== undefined) productInput.tags = input.tags;

		const result = await ctx.shopify.query(mutation, { product: productInput });
		const data = result.data ?? result;
		const payload = data.productCreate;

		if (payload.userErrors?.length > 0) {
			throw new Error(`Product creation failed: ${payload.userErrors.map((e: any) => e.message).join("; ")}`);
		}

		const product = payload.product;
		return {
			product: {
				...product,
				variants: product.variants?.edges?.map((e: any) => e.node) ?? [],
			},
		};
	},
});
