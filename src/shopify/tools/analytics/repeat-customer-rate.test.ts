import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import repeatCustomerRate from "./repeat-customer-rate.tool.js";

function makeCtx(queryFn: ReturnType<typeof vi.fn>): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

function makeOrdersResponse(orders: any[], hasNextPage = false, endCursor: string | null = null) {
	return {
		data: {
			orders: {
				edges: orders.map((o) => ({ node: o })),
				pageInfo: { hasNextPage, endCursor },
			},
		},
	};
}

describe("repeat_customer_rate", () => {
	it("has correct definition metadata", () => {
		expect(repeatCustomerRate.name).toBe("repeat_customer_rate");
		expect(repeatCustomerRate.domain).toBe("analytics");
		expect(repeatCustomerRate.tier).toBe(1);
		expect(repeatCustomerRate.scopes).toEqual(["read_orders", "read_customers"]);
		expect(repeatCustomerRate.handler).toBeDefined();
	});

	it("identifies repeat customers (>1 order)", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{ id: "1", customer: { id: "c1" } },
				{ id: "2", customer: { id: "c2" } },
				{ id: "3", customer: { id: "c1" } },
				{ id: "4", customer: { id: "c3" } },
				{ id: "5", customer: { id: "c1" } },
			]),
		);

		const result = await repeatCustomerRate.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalCustomers).toBe(3);
		expect(result.repeatCustomers).toBe(1);
		expect(result.repeatRate).toBe(33.33);
		expect(result.averageOrdersPerRepeatCustomer).toBe(3);
	});

	it("handles zero orders", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await repeatCustomerRate.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalCustomers).toBe(0);
		expect(result.repeatCustomers).toBe(0);
		expect(result.repeatRate).toBe(0);
		expect(result.averageOrdersPerRepeatCustomer).toBe(0);
	});

	it("handles all unique customers (no repeats)", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{ id: "1", customer: { id: "c1" } },
				{ id: "2", customer: { id: "c2" } },
				{ id: "3", customer: { id: "c3" } },
			]),
		);

		const result = await repeatCustomerRate.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalCustomers).toBe(3);
		expect(result.repeatCustomers).toBe(0);
		expect(result.repeatRate).toBe(0);
	});

	it("handles orders without customer data", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{ id: "1", customer: { id: "c1" } },
				{ id: "2", customer: null },
				{ id: "3", customer: { id: "c1" } },
			]),
		);

		const result = await repeatCustomerRate.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		// Only c1 counted, no null customer
		expect(result.totalCustomers).toBe(1);
		expect(result.repeatCustomers).toBe(1);
		expect(result.repeatRate).toBe(100);
	});

	it("handles all repeat customers", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{ id: "1", customer: { id: "c1" } },
				{ id: "2", customer: { id: "c1" } },
				{ id: "3", customer: { id: "c2" } },
				{ id: "4", customer: { id: "c2" } },
			]),
		);

		const result = await repeatCustomerRate.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalCustomers).toBe(2);
		expect(result.repeatCustomers).toBe(2);
		expect(result.repeatRate).toBe(100);
		expect(result.averageOrdersPerRepeatCustomer).toBe(2);
	});
});
