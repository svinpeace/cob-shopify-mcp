import { describe, expect, it } from "vitest";
import { getOrderTimeline } from "./get-order-timeline.tool.js";

const mockData = {
	order: {
		id: "gid://shopify/Order/123",
		name: "#1001",
		events: {
			edges: [
				{ node: { id: "gid://shopify/BasicEvent/1", createdAt: "2026-03-01T10:00:00Z", message: "Order created" } },
				{ node: { id: "gid://shopify/BasicEvent/2", createdAt: "2026-03-01T12:00:00Z", message: "Payment captured" } },
			],
		},
	},
};

describe("get_order_timeline", () => {
	it("has correct tool definition", () => {
		expect(getOrderTimeline.name).toBe("get_order_timeline");
		expect(getOrderTimeline.domain).toBe("orders");
		expect(getOrderTimeline.tier).toBe(1);
		expect(getOrderTimeline.scopes).toEqual(["read_orders"]);
		expect(getOrderTimeline.graphql).toBeDefined();
	});

	it("maps response with flattened events", () => {
		const result = getOrderTimeline.response?.(mockData);

		expect(result.order).toEqual({ id: "gid://shopify/Order/123", name: "#1001" });
		expect(result.events).toHaveLength(2);
		expect(result.events[0].message).toBe("Order created");
		expect(result.events[1].message).toBe("Payment captured");
	});

	it("handles null order", () => {
		const result = getOrderTimeline.response?.({ order: null });

		expect(result.order).toBeNull();
		expect(result.events).toEqual([]);
	});
});
