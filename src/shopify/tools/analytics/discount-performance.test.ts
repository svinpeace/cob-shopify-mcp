import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import discountPerformance from "./discount-performance.tool.js";

describe.skipIf(skipIfNoCredentials())("discount_performance", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(discountPerformance);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(discountPerformance.name).toBe("discount_performance");
		expect(discountPerformance.domain).toBe("analytics");
		expect(discountPerformance.tier).toBe(1);
		expect(discountPerformance.scopes).toEqual(["read_reports"]);
		expect(discountPerformance.handler).toBeDefined();
	});

	it("returns discount performance with correct field types", async () => {
		const result = await context.engine.execute(
			"discount_performance",
			{ start_date: "2024-01-01", end_date: "2026-12-31" },
			context.ctx,
		);
		const data = result.data as any;
		expect(data.discountedSales).toBeDefined();
		expect(typeof data.discountedSales.totalSales).toBe("number");
		expect(typeof data.discountedSales.orders).toBe("number");
		expect(typeof data.discountedSales.totalDiscounts).toBe("number");
		expect(data.allSales).toBeDefined();
		expect(typeof data.allSales.totalSales).toBe("number");
		expect(typeof data.allSales.orders).toBe("number");
		expect(typeof data.discountedPercentage).toBe("number");
		expect(typeof data.discountImpact).toBe("number");
		expect(data.discountedPercentage).toBeGreaterThanOrEqual(0);
		expect(data.discountedPercentage).toBeLessThanOrEqual(100);
	});
});
