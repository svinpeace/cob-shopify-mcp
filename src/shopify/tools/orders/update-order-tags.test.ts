import { describe, expect, it } from "vitest";
import { updateOrderTags } from "./update-order-tags.tool.js";

describe("update_order_tags", () => {
	it("has correct tool definition", () => {
		expect(updateOrderTags.name).toBe("update_order_tags");
		expect(updateOrderTags.domain).toBe("orders");
		expect(updateOrderTags.tier).toBe(1);
		expect(updateOrderTags.scopes).toEqual(["write_orders"]);
		expect(updateOrderTags.graphql).toBeDefined();
	});

	it("maps successful response", () => {
		const result = updateOrderTags.response?.({
			tagsAdd: {
				node: { id: "gid://shopify/Order/1" },
				userErrors: [],
			},
		});

		expect(result.node.id).toBe("gid://shopify/Order/1");
	});

	it("returns errors when userErrors present", () => {
		const result = updateOrderTags.response?.({
			tagsAdd: {
				node: null,
				userErrors: [{ field: ["tags"], message: "Failed" }],
			},
		});

		expect(result.errors).toHaveLength(1);
	});
});
