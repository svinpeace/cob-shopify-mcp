import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import salesSummary from "./sales-summary.tool.js";
import topProducts from "./top-products.tool.js";

describe.skipIf(skipIfNoCredentials())("Analytics Integration", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(salesSummary);
		context.registry.register(topProducts);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("sales_summary returns total, count, and average fields", async () => {
		const result = await context.engine.execute(
			"sales_summary",
			{ start_date: "2024-01-01", end_date: "2026-12-31" },
			context.ctx,
		);
		const data = result.data as {
			totalSales: number;
			orderCount: number;
			averageOrderValue: number;
			currency: string;
		};

		expect(typeof data.totalSales).toBe("number");
		expect(typeof data.orderCount).toBe("number");
		expect(typeof data.averageOrderValue).toBe("number");
		expect(typeof data.currency).toBe("string");
	});

	it("top_products returns product rankings", async () => {
		const result = await context.engine.execute(
			"top_products",
			{ start_date: "2024-01-01", end_date: "2026-12-31", sort_by: "revenue", limit: 5 },
			context.ctx,
		);
		const data = result.data as { products: unknown[]; count: number };

		expect(Array.isArray(data.products)).toBe(true);
		expect(typeof data.count).toBe("number");

		if (data.products.length > 0) {
			const product = data.products[0] as Record<string, unknown>;
			expect(product.productId).toBeDefined();
			expect(product.productTitle).toBeDefined();
			expect(typeof product.totalRevenue).toBe("number");
			expect(typeof product.totalQuantity).toBe("number");
		}
	});

	it("cost tracker records API costs after analytics calls", async () => {
		const stats = context.ctx.costTracker.getSessionStats();
		expect(stats.totalCallsMade).toBeGreaterThan(0);
		expect(stats.totalCostConsumed).toBeGreaterThan(0);
	});
});
