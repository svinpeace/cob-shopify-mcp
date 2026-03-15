import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import productVendorPerformance from "./product-vendor-performance.tool.js";

describe.skipIf(skipIfNoCredentials())("product_vendor_performance", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(productVendorPerformance);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(productVendorPerformance.name).toBe("product_vendor_performance");
		expect(productVendorPerformance.domain).toBe("analytics");
		expect(productVendorPerformance.tier).toBe(1);
		expect(productVendorPerformance.scopes).toEqual(["read_reports"]);
		expect(productVendorPerformance.handler).toBeDefined();
	});

	it("returns vendors array with correct field types", async () => {
		const result = await context.engine.execute(
			"product_vendor_performance",
			{ start_date: "2024-01-01", end_date: "2026-12-31" },
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.vendors)).toBe(true);
		expect(typeof data.count).toBe("number");
		for (const vendor of data.vendors) {
			expect(typeof vendor.vendor).toBe("string");
			expect(typeof vendor.totalSales).toBe("number");
			expect(typeof vendor.netSales).toBe("number");
			expect(typeof vendor.orders).toBe("number");
		}
	});

	it("respects sort_by parameter", async () => {
		const result = await context.engine.execute(
			"product_vendor_performance",
			{ start_date: "2024-01-01", end_date: "2026-12-31", sort_by: "orders" },
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.vendors)).toBe(true);
	});
});
