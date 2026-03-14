import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./add-order-tag.graphql";

export const addOrderTag = defineTool({
	name: "add_order_tag",
	domain: "orders",
	tier: 1,
	description: "Add one or more tags to an order.",
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
