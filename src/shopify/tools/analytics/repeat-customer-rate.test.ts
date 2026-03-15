import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import repeatCustomerRate from "./repeat-customer-rate.tool.js";

describe.skipIf(skipIfNoCredentials())("repeat_customer_rate", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(repeatCustomerRate);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(repeatCustomerRate.name).toBe("repeat_customer_rate");
		expect(repeatCustomerRate.domain).toBe("analytics");
		expect(repeatCustomerRate.tier).toBe(1);
		expect(repeatCustomerRate.scopes).toEqual(["read_reports"]);
		expect(repeatCustomerRate.handler).toBeDefined();
	});

	it("returns repeat customer data for a date range", async () => {
		const result = await context.engine.execute(
			"repeat_customer_rate",
			{ start_date: "2024-01-01", end_date: "2026-12-31" },
			context.ctx,
		);
		const data = result.data as any;

		expect(typeof data.totalCustomers).toBe("number");
		expect(data.totalCustomers).toBeGreaterThanOrEqual(0);

		expect(typeof data.repeatCustomers).toBe("number");
		expect(data.repeatCustomers).toBeGreaterThanOrEqual(0);

		expect(typeof data.repeatRate).toBe("number");
		expect(data.repeatRate).toBeGreaterThanOrEqual(0);
		expect(data.repeatRate).toBeLessThanOrEqual(100);

		expect(typeof data.totalOrders).toBe("number");
		expect(typeof data.note).toBe("string");
	});

	it("handles a narrow date range", async () => {
		const result = await context.engine.execute(
			"repeat_customer_rate",
			{ start_date: "2026-01-01", end_date: "2026-01-02" },
			context.ctx,
		);
		const data = result.data as any;

		expect(typeof data.totalCustomers).toBe("number");
		expect(typeof data.repeatCustomers).toBe("number");
		expect(typeof data.repeatRate).toBe("number");
		expect(data.repeatCustomers).toBeLessThanOrEqual(data.totalCustomers);
	});

	it("repeat customers never exceed total customers", async () => {
		const result = await context.engine.execute(
			"repeat_customer_rate",
			{ start_date: "2024-06-01", end_date: "2026-06-30" },
			context.ctx,
		);
		const data = result.data as any;

		expect(data.repeatCustomers).toBeLessThanOrEqual(data.totalCustomers);
	});
});
