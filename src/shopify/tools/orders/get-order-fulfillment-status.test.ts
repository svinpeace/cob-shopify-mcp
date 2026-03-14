import { describe, expect, it } from "vitest";
import { getOrderFulfillmentStatus } from "./get-order-fulfillment-status.tool.js";

const mockData = {
	order: {
		id: "gid://shopify/Order/123",
		name: "#1001",
		displayFulfillmentStatus: "FULFILLED",
		fulfillments: [
			{
				id: "gid://shopify/Fulfillment/1",
				status: "SUCCESS",
				createdAt: "2026-03-02T10:00:00Z",
				trackingInfo: [{ number: "1Z999AA10123456784", url: "https://tracking.ups.com/123", company: "UPS" }],
			},
		],
	},
};

describe("get_order_fulfillment_status", () => {
	it("has correct tool definition", () => {
		expect(getOrderFulfillmentStatus.name).toBe("get_order_fulfillment_status");
		expect(getOrderFulfillmentStatus.domain).toBe("orders");
		expect(getOrderFulfillmentStatus.tier).toBe(1);
		expect(getOrderFulfillmentStatus.scopes).toEqual(["read_orders", "read_assigned_fulfillment_orders"]);
		expect(getOrderFulfillmentStatus.graphql).toBeDefined();
	});

	it("maps response with fulfillment tracking details", () => {
		const result = getOrderFulfillmentStatus.response?.(mockData);

		expect(result.order.displayFulfillmentStatus).toBe("FULFILLED");
		expect(result.order.fulfillments).toHaveLength(1);
		expect(result.order.fulfillments[0].trackingInfo[0].number).toBe("1Z999AA10123456784");
		expect(result.order.fulfillments[0].trackingInfo[0].url).toBe("https://tracking.ups.com/123");
		expect(result.order.fulfillments[0].trackingInfo[0].company).toBe("UPS");
	});

	it("handles null order", () => {
		const result = getOrderFulfillmentStatus.response?.({ order: null });

		expect(result.order).toBeNull();
	});
});
