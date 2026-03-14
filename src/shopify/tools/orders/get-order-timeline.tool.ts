import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-order-timeline.graphql";

export const getOrderTimeline = defineTool({
	name: "get_order_timeline",
	domain: "orders",
	tier: 1,
	description: "Get the event timeline for an order (comments, status changes, fulfillments, refunds).",
	scopes: ["read_orders"],
	input: {
		id: z.string(),
	},
	graphql: query,
	response: (data: any) => {
		const raw = data.data ?? data;
		const order = raw.order;
		if (!order) return { order: null, events: [] };
		return {
			order: { id: order.id, name: order.name },
			events: order.events.edges.map((e: any) => e.node),
		};
	},
});
