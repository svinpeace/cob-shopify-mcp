import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./create-product-variant.graphql";

export const createProductVariant = defineTool({
	name: "create_product_variant",
	domain: "products",
	tier: 1,
	description: "Add a variant to an existing product with price, SKU, and options.",
	scopes: ["write_products"],
	input: {
		product_id: z.string(),
		price: z.string(),
		sku: z.string().optional(),
		options: z.array(z.string()).optional(),
	},
	handler: async (
		input: {
			product_id: string;
			price: string;
			sku?: string;
			options?: string[];
		},
		ctx: ExecutionContext,
	) => {
		const variantInput: Record<string, unknown> = {
			price: input.price,
		};
		if (input.sku !== undefined) variantInput.sku = input.sku;
		if (input.options !== undefined) variantInput.optionValues = input.options.map((v) => ({ name: v }));

		const result = await ctx.shopify.query(mutation, {
			productId: input.product_id,
			variants: [variantInput],
		});
		const data = result.data ?? result;
		const payload = data.productVariantsBulkCreate;

		if (payload.userErrors?.length > 0) {
			throw new Error(`Variant creation failed: ${payload.userErrors.map((e: any) => e.message).join("; ")}`);
		}

		return { variant: payload.productVariants[0] };
	},
});
