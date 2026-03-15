import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import trafficAnalytics from "./traffic-analytics.tool.js";

describe.skipIf(skipIfNoCredentials())("traffic_analytics", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(trafficAnalytics);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(trafficAnalytics.name).toBe("traffic_analytics");
		expect(trafficAnalytics.domain).toBe("analytics");
		expect(trafficAnalytics.tier).toBe(1);
		expect(trafficAnalytics.scopes).toEqual(["read_reports"]);
		expect(trafficAnalytics.handler).toBeDefined();
	});

	it("returns periods array with correct field types", async () => {
		const result = await context.engine.execute(
			"traffic_analytics",
			{ start_date: "2024-01-01", end_date: "2026-12-31", group_by: "month" },
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.periods)).toBe(true);
		expect(data.groupBy).toBe("month");
		expect(typeof data.totalSessions).toBe("number");
		for (const period of data.periods) {
			expect(typeof period.period).toBe("string");
			expect(typeof period.sessions).toBe("number");
		}
	});
});
