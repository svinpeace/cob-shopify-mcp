import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./update-order-note.graphql";

export const updateOrderNote = defineTool({
	name: "update_order_note",
	domain: "orders",
	tier: 1,
	description: "Update an existing note on an order.",
	scopes: ["write_orders"],
	input: {
		id: z.string(),
		note: z.string(),
	},
	handler: async (input, ctx) => {
		const raw = await ctx.shopify.query(query, {
			input: { id: input.id, note: input.note },
		});
		const data = raw.data ?? raw;
		const result = data.orderUpdate;
		if (result.userErrors?.length > 0) {
			return { errors: result.userErrors };
		}
		return { order: result.order };
	},
});
