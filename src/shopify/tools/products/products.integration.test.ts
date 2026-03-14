import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import { getProduct } from "./get-product.tool.js";
import { listCollections } from "./list-collections.tool.js";
import { listProductVariants } from "./list-product-variants.tool.js";
import { listProducts } from "./list-products.tool.js";
import { searchProducts } from "./search-products.tool.js";

describe.skipIf(skipIfNoCredentials())("Products Integration", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(listProducts);
		context.registry.register(getProduct);
		context.registry.register(searchProducts);
		context.registry.register(listProductVariants);
		context.registry.register(listCollections);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("list_products returns products from real store", async () => {
		const result = await context.engine.execute("list_products", { limit: 5 }, context.ctx);
		expect(result.data).toBeDefined();

		const data = result.data as { products: unknown[]; pageInfo: unknown };
		expect(Array.isArray(data.products)).toBe(true);
		expect(data.products.length).toBeGreaterThan(0);
		expect(data.products.length).toBeLessThanOrEqual(5);
		expect(data.pageInfo).toBeDefined();

		const product = data.products[0] as Record<string, unknown>;
		expect(product.id).toBeDefined();
		expect(typeof product.id).toBe("string");
		expect(product.title).toBeDefined();
	});

	it("list_products with limit=1 returns exactly 1 product", async () => {
		const result = await context.engine.execute("list_products", { limit: 1 }, context.ctx);
		const data = result.data as { products: unknown[] };
		expect(data.products).toHaveLength(1);
	});

	it("get_product with a valid ID returns product details", async () => {
		// First get a product ID from list
		const listResult = await context.engine.execute("list_products", { limit: 1 }, context.ctx);
		const listData = listResult.data as { products: Array<{ id: string }> };
		const productId = listData.products[0].id;

		const result = await context.engine.execute("get_product", { id: productId }, context.ctx);
		const data = result.data as { product: Record<string, unknown> };

		expect(data.product).toBeDefined();
		expect(data.product.id).toBe(productId);
		expect(data.product.title).toBeDefined();
		expect(Array.isArray(data.product.variants)).toBe(true);
	});

	it("search_products with a broad term returns results", async () => {
		// First get a product title to search for
		const listResult = await context.engine.execute("list_products", { limit: 1 }, context.ctx);
		const listData = listResult.data as { products: Array<{ title: string }> };
		const searchTerm = listData.products[0].title.split(" ")[0];

		const result = await context.engine.execute("search_products", { query: searchTerm, limit: 5 }, context.ctx);
		const data = result.data as { products: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.products)).toBe(true);
		expect(data.pageInfo).toBeDefined();
	});

	it("list_product_variants for a known product returns variants", async () => {
		const listResult = await context.engine.execute("list_products", { limit: 1 }, context.ctx);
		const listData = listResult.data as { products: Array<{ id: string }> };
		const productId = listData.products[0].id;

		const result = await context.engine.execute(
			"list_product_variants",
			{ product_id: productId, limit: 10 },
			context.ctx,
		);
		const data = result.data as { variants: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.variants)).toBe(true);
		expect(data.variants.length).toBeGreaterThan(0);
	});

	it("list_collections returns collections array", async () => {
		const result = await context.engine.execute("list_collections", { limit: 5 }, context.ctx);
		const data = result.data as { collections: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.collections)).toBe(true);
		expect(data.pageInfo).toBeDefined();
	});

	it("cost tracker records API costs after product calls", async () => {
		const stats = context.ctx.costTracker.getSessionStats();
		expect(stats.totalCallsMade).toBeGreaterThan(0);
		expect(stats.totalCostConsumed).toBeGreaterThan(0);
		expect(stats.averageCostPerCall).toBeGreaterThan(0);
	});
});
