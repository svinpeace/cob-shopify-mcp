import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import ordersByDateRange from "./orders-by-date-range.tool.js";

describe.skipIf(skipIfNoCredentials())("orders_by_date_range", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(ordersByDateRange);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(ordersByDateRange.name).toBe("orders_by_date_range");
		expect(ordersByDateRange.domain).toBe("analytics");
		expect(ordersByDateRange.tier).toBe(1);
		expect(ordersByDateRange.scopes).toEqual(["read_reports"]);
		expect(ordersByDateRange.handler).toBeDefined();
	});

	it("returns periods grouped by day", async () => {
		const result = await context.engine.execute(
			"orders_by_date_range",
			{ start_date: "2024-01-01", end_date: "2026-12-31", group_by: "day" },
			context.ctx,
		);
		const data = result.data as any;
		expect(data.groupBy).toBe("day");
		expect(Array.isArray(data.periods)).toBe(true);
		if (data.periods.length > 0) {
			const first = data.periods[0];
			expect(typeof first.period).toBe("string");
			expect(typeof first.orderCount).toBe("number");
			expect(typeof first.totalSales).toBe("number");
		}
	});
});
