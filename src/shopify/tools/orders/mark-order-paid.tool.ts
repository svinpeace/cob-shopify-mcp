import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./mark-order-paid.graphql";

export const markOrderPaid = defineTool({
	name: "mark_order_paid",
	domain: "orders",
	tier: 1,
	description: "Mark an order as paid using the orderMarkAsPaid mutation.",
	scopes: ["write_orders"],
	input: {
		id: z.string(),
	},
	handler: async (input, ctx) => {
		const raw = await ctx.shopify.query(query, {
			input: { id: input.id },
		});
		const data = raw.data ?? raw;
		const result = data.orderMarkAsPaid;
		if (result.userErrors?.length > 0) {
			return { errors: result.userErrors };
		}
		return { order: result.order };
	},
});
