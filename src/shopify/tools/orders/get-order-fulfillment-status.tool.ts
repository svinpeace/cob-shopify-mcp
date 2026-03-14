import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-order-fulfillment-status.graphql";

export const getOrderFulfillmentStatus = defineTool({
	name: "get_order_fulfillment_status",
	domain: "orders",
	tier: 1,
	description:
		"Get the fulfillment status of an order with tracking numbers, carrier, and tracking URLs for each fulfillment.",
	scopes: ["read_orders", "read_assigned_fulfillment_orders"],
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
				id: order.id,
				name: order.name,
				displayFulfillmentStatus: order.displayFulfillmentStatus,
				fulfillments: order.fulfillments,
			},
		};
	},
});
