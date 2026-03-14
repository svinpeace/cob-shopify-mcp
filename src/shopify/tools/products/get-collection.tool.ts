import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-collection.graphql";

export const getCollection = defineTool({
	name: "get_collection",
	domain: "products",
	tier: 1,
	description: "Get a single collection by its Shopify GID. Returns collection details with its products.",
	scopes: ["read_products"],
	input: {
		id: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const collection = raw.collection;
		if (!collection) return { collection: null };
		return {
			collection: {
				...collection,
				products: collection.products?.edges?.map((e: any) => e.node) ?? [],
				productsPageInfo: collection.products?.pageInfo ?? null,
			},
		};
	},
});
