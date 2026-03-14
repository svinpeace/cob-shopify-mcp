import { describe, expect, it } from "vitest";
import { addOrderTag } from "./add-order-tag.tool.js";

describe("add_order_tag", () => {
	it("has correct tool definition", () => {
		expect(addOrderTag.name).toBe("add_order_tag");
		expect(addOrderTag.domain).toBe("orders");
		expect(addOrderTag.tier).toBe(1);
		expect(addOrderTag.scopes).toEqual(["write_orders"]);
		expect(addOrderTag.graphql).toBeDefined();
	});

	it("maps successful response", () => {
		const result = addOrderTag.response?.({
			tagsAdd: {
				node: { id: "gid://shopify/Order/1" },
				userErrors: [],
			},
		});

		expect(result.node.id).toBe("gid://shopify/Order/1");
	});

	it("returns errors when userErrors present", () => {
		const result = addOrderTag.response?.({
			tagsAdd: {
				node: null,
				userErrors: [{ field: ["tags"], message: "Invalid tag" }],
			},
		});

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toBe("Invalid tag");
	});
});
