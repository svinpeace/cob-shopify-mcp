import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./update-order-tags.graphql";

export const updateOrderTags = defineTool({
	name: "update_order_tags",
	domain: "orders",
	tier: 1,
	description: "Set or replace tags on an order using tagsAdd.",
	scopes: ["write_orders"],
	input: {
		id: z.string(),
		tags: z.array(z.string()),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const result = raw.tagsAdd;
		if (result.userErrors?.length > 0) {
			return { errors: result.userErrors };
		}
		return { node: result.node };
	},
});
