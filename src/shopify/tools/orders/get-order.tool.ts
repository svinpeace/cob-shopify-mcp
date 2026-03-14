import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-order.graphql";

export const getOrder = defineTool({
	name: "get_order",
	domain: "orders",
	tier: 1,
	description:
		"Get a single order by ID with full detail: all line items, fulfillments with tracking, customer, addresses, notes, and tags.",
	scopes: ["read_orders"],
	outputFields: [
		"id",
		"name",
		"createdAt",
		"updatedAt",
		"displayFinancialStatus",
		"displayFulfillmentStatus",
		"totalPriceSet",
		"subtotalPriceSet",
		"totalTaxSet",
		"totalShippingPriceSet",
		"customer",
		"lineItems",
		"fulfillments",
		"shippingAddress",
		"billingAddress",
		"note",
		"tags",
	],
	input: {
		id: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const order = raw.order;
		if (!order) return { order: null };
		return {
			order: {
				...order,
				lineItems: order.lineItems.edges.map((e: any) => e.node),
			},
		};
	},
});
