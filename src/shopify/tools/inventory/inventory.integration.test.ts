import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import { listInventoryLevels } from "./list-inventory-levels.tool.js";
import { lowStockReport } from "./low-stock-report.tool.js";

describe.skipIf(skipIfNoCredentials())("Inventory Integration", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(listInventoryLevels);
		context.registry.register(lowStockReport);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("list_inventory_levels returns levels with location info", async () => {
		const result = await context.engine.execute("list_inventory_levels", { limit: 10 }, context.ctx);
		const data = result.data as { inventoryItems: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.inventoryItems)).toBe(true);
		expect(data.pageInfo).toBeDefined();

		if (data.inventoryItems.length > 0) {
			const item = data.inventoryItems[0] as Record<string, unknown>;
			expect(item.inventoryLevels).toBeDefined();
			expect(Array.isArray(item.inventoryLevels)).toBe(true);
		}
	});

	it("low_stock_report runs without error", async () => {
		const result = await context.engine.execute("low_stock_report", { threshold: 10, limit: 5 }, context.ctx);
		const data = result.data as { count: number; threshold: number; items: unknown[] };

		expect(typeof data.count).toBe("number");
		expect(data.threshold).toBe(10);
		expect(Array.isArray(data.items)).toBe(true);
	});

	it("cost tracker records API costs after inventory calls", async () => {
		const stats = context.ctx.costTracker.getSessionStats();
		expect(stats.totalCallsMade).toBeGreaterThan(0);
		expect(stats.totalCostConsumed).toBeGreaterThan(0);
	});
});
