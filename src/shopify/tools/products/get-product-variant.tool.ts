import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-product-variant.graphql";

export const getProductVariant = defineTool({
	name: "get_product_variant",
	domain: "products",
	tier: 1,
	description:
		"Get a single product variant by its Shopify GID. Returns full variant detail including price, SKU, and selected options.",
	scopes: ["read_products"],
	input: {
		id: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		return { variant: raw.productVariant ?? null };
	},
});
