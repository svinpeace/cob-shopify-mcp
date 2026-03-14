import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-product.graphql";

export const getProduct = defineTool({
	name: "get_product",
	domain: "products",
	tier: 1,
	description:
		"Get a single product by its Shopify GID. Returns full product detail including all variants and images.",
	scopes: ["read_products"],
	outputFields: [
		"id",
		"title",
		"handle",
		"descriptionHtml",
		"status",
		"vendor",
		"productType",
		"tags",
		"totalInventory",
		"createdAt",
		"updatedAt",
		"featuredMedia",
		"media",
		"variants",
	],
	input: {
		id: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const product = raw.product;
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
