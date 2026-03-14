import { describe, expect, it } from "vitest";
import { getOrder } from "./get-order.tool.js";

const mockData = {
	order: {
		id: "gid://shopify/Order/123",
		name: "#1001",
		createdAt: "2026-03-01T10:00:00Z",
		updatedAt: "2026-03-02T10:00:00Z",
		displayFinancialStatus: "PAID",
		displayFulfillmentStatus: "FULFILLED",
		totalPriceSet: { shopMoney: { amount: "129.99", currencyCode: "USD" } },
		subtotalPriceSet: { shopMoney: { amount: "119.99", currencyCode: "USD" } },
		totalTaxSet: { shopMoney: { amount: "10.00", currencyCode: "USD" } },
		totalShippingPriceSet: { shopMoney: { amount: "0.00", currencyCode: "USD" } },
		customer: {
			id: "gid://shopify/Customer/1",
			displayName: "John Doe",
			defaultEmailAddress: { emailAddress: "john@example.com" },
		},
		lineItems: {
			edges: [
				{
					node: {
						title: "Classic Hoodie",
						quantity: 2,
						sku: "HOOD-SM",
						variantTitle: "Small / Black",
						originalUnitPriceSet: { shopMoney: { amount: "49.99", currencyCode: "USD" } },
					},
				},
			],
		},
		fulfillments: [
			{
				status: "SUCCESS",
				trackingInfo: [{ number: "1Z999AA10123456784", url: "https://tracking.ups.com/123", company: "UPS" }],
			},
		],
		shippingAddress: {
			address1: "123 Main St",
			address2: null,
			city: "Portland",
			province: "OR",
			zip: "97201",
			country: "US",
		},
		billingAddress: {
			address1: "123 Main St",
			address2: null,
			city: "Portland",
			province: "OR",
			zip: "97201",
			country: "US",
		},
		note: "Customer requested gift wrapping",
		tags: ["vip", "gift"],
	},
};

describe("get_order", () => {
	it("has correct tool definition", () => {
		expect(getOrder.name).toBe("get_order");
		expect(getOrder.domain).toBe("orders");
		expect(getOrder.tier).toBe(1);
		expect(getOrder.scopes).toEqual(["read_orders"]);
		expect(getOrder.graphql).toBeDefined();
	});

	it("maps response with full detail", () => {
		const result = getOrder.response?.(mockData);

		expect(result.order.id).toBe("gid://shopify/Order/123");
		expect(result.order.lineItems).toHaveLength(1);
		expect(result.order.lineItems[0].sku).toBe("HOOD-SM");
		expect(result.order.lineItems[0].variantTitle).toBe("Small / Black");
		expect(result.order.fulfillments[0].trackingInfo[0].number).toBe("1Z999AA10123456784");
		expect(result.order.shippingAddress.city).toBe("Portland");
		expect(result.order.note).toBe("Customer requested gift wrapping");
		expect(result.order.tags).toEqual(["vip", "gift"]);
	});

	it("handles null order", () => {
		const result = getOrder.response?.({ order: null });

		expect(result.order).toBeNull();
	});
});
