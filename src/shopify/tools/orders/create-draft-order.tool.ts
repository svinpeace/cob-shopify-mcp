import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./create-draft-order.graphql";

export const createDraftOrder = defineTool({
	name: "create_draft_order",
	domain: "orders",
	tier: 1,
	description:
		"Create a draft order with line items, optional customer, shipping address, and note. Returns draft order with calculated totals.",
	scopes: ["write_draft_orders"],
	input: {
		line_items: z.array(
			z.object({
				variant_id: z.string(),
				quantity: z.number().min(1),
			}),
		),
		customer_id: z.string().optional(),
		note: z.string().optional(),
		shipping_address: z
			.object({
				address1: z.string(),
				address2: z.string().optional(),
				city: z.string(),
				province: z.string().optional(),
				zip: z.string(),
				country: z.string(),
				firstName: z.string().optional(),
				lastName: z.string().optional(),
			})
			.optional(),
	},
	handler: async (input, ctx) => {
		const draftInput: Record<string, unknown> = {
			lineItems: input.line_items.map((item: { variant_id: string; quantity: number }) => ({
				variantId: item.variant_id,
				quantity: item.quantity,
			})),
		};
		if (input.customer_id) {
			draftInput.customerId = input.customer_id;
		}
		if (input.note) {
			draftInput.note2 = input.note;
		}
		if (input.shipping_address) {
			draftInput.shippingAddress = input.shipping_address;
		}

		const raw = await ctx.shopify.query(query, { input: draftInput });
		const data = raw.data ?? raw;
		const result = data.draftOrderCreate;
		if (result.userErrors?.length > 0) {
			return { errors: result.userErrors };
		}
		const draft = result.draftOrder;
		return {
			draftOrder: {
				...draft,
				lineItems: draft.lineItems.edges.map((e: any) => e.node),
			},
		};
	},
});
