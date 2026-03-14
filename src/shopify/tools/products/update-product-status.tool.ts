import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./update-product-status.graphql";

export const updateProductStatus = defineTool({
	name: "update_product_status",
	domain: "products",
	tier: 1,
	description: "Change a product's status to ACTIVE, DRAFT, or ARCHIVED.",
	scopes: ["write_products"],
	input: {
		id: z.string(),
		status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
	},
	handler: async (input: { id: string; status: string }, ctx: ExecutionContext) => {
		const result = await ctx.shopify.query(mutation, {
			product: { id: input.id, status: input.status },
		});
		const data = result.data ?? result;
		const payload = data.productUpdate;

		if (payload.userErrors?.length > 0) {
			throw new Error(`Status update failed: ${payload.userErrors.map((e: any) => e.message).join("; ")}`);
		}

		return { product: payload.product };
	},
});
