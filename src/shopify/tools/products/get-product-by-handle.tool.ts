import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-product-by-handle.graphql";

export const getProductByHandle = defineTool({
	name: "get_product_by_handle",
	domain: "products",
	tier: 1,
	description: "Get a product by its URL handle (slug). Returns full product detail including all variants and images.",
	scopes: ["read_products"],
	input: {
		handle: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const product = raw.productByIdentifier;
		if (!product) return { product: null };
		return {
			product: {
				...product,
				media: product.media?.edges?.map((e: any) => e.node) ?? [],
				variants: product.variants?.edges?.map((e: any) => e.node) ?? [],
			},
		};
	},
});
