import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import customerCohortAnalysis from "./customer-cohort-analysis.tool.js";

describe.skipIf(skipIfNoCredentials())("customer_cohort_analysis", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(customerCohortAnalysis);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(customerCohortAnalysis.name).toBe("customer_cohort_analysis");
		expect(customerCohortAnalysis.domain).toBe("analytics");
		expect(customerCohortAnalysis.tier).toBe(1);
		expect(customerCohortAnalysis.scopes).toEqual(["read_reports"]);
		expect(customerCohortAnalysis.handler).toBeDefined();
	});

	it("returns periods array with correct field types", async () => {
		const result = await context.engine.execute(
			"customer_cohort_analysis",
			{ start_date: "2024-01-01", end_date: "2026-12-31", group_by: "month" },
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.periods)).toBe(true);
		expect(typeof data.count).toBe("number");
		expect(data.groupBy).toBe("month");
		for (const period of data.periods) {
			expect(typeof period.period).toBe("string");
			expect(typeof period.totalCustomers).toBe("number");
			expect(typeof period.orders).toBe("number");
			expect(typeof period.totalSales).toBe("number");
		}
	});
});
