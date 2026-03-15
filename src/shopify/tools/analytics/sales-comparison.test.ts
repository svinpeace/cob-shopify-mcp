import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import salesComparison from "./sales-comparison.tool.js";

describe.skipIf(skipIfNoCredentials())("sales_comparison", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(salesComparison);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(salesComparison.name).toBe("sales_comparison");
		expect(salesComparison.domain).toBe("analytics");
		expect(salesComparison.tier).toBe(1);
		expect(salesComparison.scopes).toEqual(["read_reports"]);
		expect(salesComparison.handler).toBeDefined();
	});

	it("returns periods array with comparison data (previous_period)", async () => {
		const result = await context.engine.execute(
			"sales_comparison",
			{
				start_date: "2025-01-01",
				end_date: "2025-06-30",
				compare_to: "previous_period",
				group_by: "month",
			},
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.periods)).toBe(true);
		expect(typeof data.count).toBe("number");
		expect(data.compareTo).toBe("previous_period");
		// Each period row should have at least the base metric columns
		for (const period of data.periods) {
			expect(period).toHaveProperty("total_sales");
			expect(period).toHaveProperty("orders");
			expect(period).toHaveProperty("net_sales");
		}
	});

	it("returns periods array with comparison data (previous_year)", async () => {
		const result = await context.engine.execute(
			"sales_comparison",
			{
				start_date: "2025-01-01",
				end_date: "2025-03-31",
				compare_to: "previous_year",
				group_by: "month",
			},
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.periods)).toBe(true);
		expect(data.compareTo).toBe("previous_year");
		expect(data.count).toBeGreaterThanOrEqual(0);
	});

	it("supports day granularity", async () => {
		const result = await context.engine.execute(
			"sales_comparison",
			{
				start_date: "2025-06-01",
				end_date: "2025-06-07",
				compare_to: "previous_period",
				group_by: "day",
			},
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.periods)).toBe(true);
		expect(data.compareTo).toBe("previous_period");
	});
});
