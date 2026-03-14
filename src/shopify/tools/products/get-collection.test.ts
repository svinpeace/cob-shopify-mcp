import { describe, expect, it } from "vitest";
import { getCollection } from "./get-collection.tool.js";

describe("get_collection", () => {
	it("has correct tool definition", () => {
		expect(getCollection.name).toBe("get_collection");
		expect(getCollection.domain).toBe("products");
		expect(getCollection.tier).toBe(1);
		expect(getCollection.scopes).toEqual(["read_products"]);
		expect(getCollection.graphql).toBeTruthy();
	});

	it("response mapper flattens collection with products", () => {
		const data = {
			collection: {
				id: "gid://shopify/Collection/1",
				title: "Summer",
				products: {
					edges: [{ node: { id: "p1", title: "Tee" } }],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		};

		const result = getCollection.response?.(data);
		expect(result.collection.products).toEqual([{ id: "p1", title: "Tee" }]);
		expect(result.collection.productsPageInfo).toEqual({ hasNextPage: false, endCursor: null });
	});

	it("response mapper handles null collection", () => {
		const result = getCollection.response?.({ collection: null });
		expect(result.collection).toBeNull();
	});
});
