import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import { getOrder } from "./get-order.tool.js";
import { getOrderFulfillmentStatus } from "./get-order-fulfillment-status.tool.js";
import { listOrders } from "./list-orders.tool.js";
import { searchOrders } from "./search-orders.tool.js";

describe.skipIf(skipIfNoCredentials())("Orders Integration", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(listOrders);
		context.registry.register(getOrder);
		context.registry.register(searchOrders);
		context.registry.register(getOrderFulfillmentStatus);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("list_orders returns orders from real store", async () => {
		const result = await context.engine.execute("list_orders", { limit: 5 }, context.ctx);
		const data = result.data as { orders: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.orders)).toBe(true);
		expect(data.pageInfo).toBeDefined();

		if (data.orders.length > 0) {
			const order = data.orders[0] as Record<string, unknown>;
			expect(order.id).toBeDefined();
			expect(order.name).toBeDefined();
		}
	});

	it("list_orders with limit=1 returns at most 1 order", async () => {
		const result = await context.engine.execute("list_orders", { limit: 1 }, context.ctx);
		const data = result.data as { orders: unknown[] };
		expect(data.orders.length).toBeLessThanOrEqual(1);
	});

	it("get_order with a valid order ID returns full details", async () => {
		const listResult = await context.engine.execute("list_orders", { limit: 1 }, context.ctx);
		const listData = listResult.data as { orders: Array<{ id: string }> };

		if (listData.orders.length === 0) {
			return; // No orders in store, skip gracefully
		}

		const orderId = listData.orders[0].id;
		const result = await context.engine.execute("get_order", { id: orderId }, context.ctx);
		const data = result.data as { order: Record<string, unknown> };

		expect(data.order).toBeDefined();
		expect(data.order.id).toBe(orderId);
	});

	it("search_orders with status:any returns results", async () => {
		const result = await context.engine.execute("search_orders", { query: "status:any", limit: 5 }, context.ctx);
		const data = result.data as { orders: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.orders)).toBe(true);
		expect(data.pageInfo).toBeDefined();
	});

	it("get_order_fulfillment_status returns fulfillment data", async () => {
		const listResult = await context.engine.execute("list_orders", { limit: 1 }, context.ctx);
		const listData = listResult.data as { orders: Array<{ id: string }> };

		if (listData.orders.length === 0) {
			return; // No orders in store, skip gracefully
		}

		const orderId = listData.orders[0].id;
		const result = await context.engine.execute("get_order_fulfillment_status", { id: orderId }, context.ctx);
		const data = result.data as { order: Record<string, unknown> };

		expect(data.order).toBeDefined();
		expect(data.order.id).toBe(orderId);
		expect(data.order.displayFulfillmentStatus).toBeDefined();
	});

	it("cost tracker records API costs after order calls", async () => {
		const stats = context.ctx.costTracker.getSessionStats();
		expect(stats.totalCallsMade).toBeGreaterThan(0);
		expect(stats.totalCostConsumed).toBeGreaterThan(0);
	});
});
