import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import { getCustomer } from "./get-customer.tool.js";
import { getCustomerOrders } from "./get-customer-orders.tool.js";
import { listCustomers } from "./list-customers.tool.js";
import { searchCustomers } from "./search-customers.tool.js";

describe.skipIf(skipIfNoCredentials())("Customers Integration", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(listCustomers);
		context.registry.register(searchCustomers);
		context.registry.register(getCustomer);
		context.registry.register(getCustomerOrders);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("list_customers returns customers array", async () => {
		const result = await context.engine.execute("list_customers", { limit: 5 }, context.ctx);
		const data = result.data as { customers: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.customers)).toBe(true);
		expect(data.pageInfo).toBeDefined();

		if (data.customers.length > 0) {
			const customer = data.customers[0] as Record<string, unknown>;
			expect(customer.id).toBeDefined();
		}
	});

	it("search_customers with wildcard query returns results", async () => {
		const result = await context.engine.execute("search_customers", { query: "*", limit: 5 }, context.ctx);
		const data = result.data as { customers: unknown[]; pageInfo: unknown };

		expect(Array.isArray(data.customers)).toBe(true);
		expect(data.pageInfo).toBeDefined();
	});

	it("get_customer with valid ID returns customer details", async () => {
		const listResult = await context.engine.execute("list_customers", { limit: 1 }, context.ctx);
		const listData = listResult.data as { customers: Array<{ id: string }> };

		if (listData.customers.length === 0) {
			return; // No customers in store, skip gracefully
		}

		const customerId = listData.customers[0].id;
		const result = await context.engine.execute("get_customer", { id: customerId }, context.ctx);
		const data = result.data as { customer: Record<string, unknown> };

		expect(data.customer).toBeDefined();
		expect(data.customer.id).toBe(customerId);
	});

	it("get_customer_orders returns orders for customer", async () => {
		const listResult = await context.engine.execute("list_customers", { limit: 1 }, context.ctx);
		const listData = listResult.data as { customers: Array<{ id: string }> };

		if (listData.customers.length === 0) {
			return; // No customers in store, skip gracefully
		}

		const customerId = listData.customers[0].id;
		const result = await context.engine.execute(
			"get_customer_orders",
			{ customer_id: customerId, limit: 5 },
			context.ctx,
		);
		const data = result.data as {
			customer: Record<string, unknown>;
			orders: unknown[];
			pageInfo: unknown;
		};

		expect(data.customer).toBeDefined();
		expect(Array.isArray(data.orders)).toBe(true);
		expect(data.pageInfo).toBeDefined();
	});

	it("cost tracker records API costs after customer calls", async () => {
		const stats = context.ctx.costTracker.getSessionStats();
		expect(stats.totalCallsMade).toBeGreaterThan(0);
		expect(stats.totalCostConsumed).toBeGreaterThan(0);
	});
});
