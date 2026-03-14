import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import ordersByDateRange from "./orders-by-date-range.tool.js";

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

describe("orders_by_date_range", () => {
	it("has correct definition metadata", () => {
		expect(ordersByDateRange.name).toBe("orders_by_date_range");
		expect(ordersByDateRange.domain).toBe("analytics");
		expect(ordersByDateRange.tier).toBe(1);
		expect(ordersByDateRange.scopes).toEqual(["read_orders"]);
		expect(ordersByDateRange.handler).toBeDefined();
	});

	it("groups orders by day correctly", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					createdAt: "2026-01-01T10:00:00Z",
					totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
				},
				{
					id: "2",
					createdAt: "2026-01-01T15:00:00Z",
					totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
				},
				{
					id: "3",
					createdAt: "2026-01-02T10:00:00Z",
					totalPriceSet: { shopMoney: { amount: "75.00", currencyCode: "USD" } },
				},
			]),
		);

		const result = await ordersByDateRange.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-02", group_by: "day" },
			makeCtx(queryFn),
		);

		expect(result.periods).toHaveLength(2);
		expect(result.periods[0]).toEqual({
			period: "2026-01-01",
			orderCount: 2,
			totalSales: 150,
			currency: "USD",
		});
		expect(result.periods[1]).toEqual({
			period: "2026-01-02",
			orderCount: 1,
			totalSales: 75,
			currency: "USD",
		});
		expect(result.groupBy).toBe("day");
	});

	it("groups orders by month", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					createdAt: "2026-01-15T10:00:00Z",
					totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
				},
				{
					id: "2",
					createdAt: "2026-02-10T10:00:00Z",
					totalPriceSet: { shopMoney: { amount: "200.00", currencyCode: "USD" } },
				},
			]),
		);

		const result = await ordersByDateRange.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-02-28", group_by: "month" },
			makeCtx(queryFn),
		);

		expect(result.periods).toHaveLength(2);
		expect(result.periods[0].period).toBe("2026-01");
		expect(result.periods[1].period).toBe("2026-02");
		expect(result.groupBy).toBe("month");
	});

	it("groups orders by week", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					createdAt: "2026-01-05T10:00:00Z", // Monday
					totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
				},
				{
					id: "2",
					createdAt: "2026-01-07T10:00:00Z", // Wednesday, same week
					totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
				},
				{
					id: "3",
					createdAt: "2026-01-12T10:00:00Z", // Next Monday
					totalPriceSet: { shopMoney: { amount: "75.00", currencyCode: "USD" } },
				},
			]),
		);

		const result = await ordersByDateRange.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-15", group_by: "week" },
			makeCtx(queryFn),
		);

		expect(result.periods).toHaveLength(2);
		expect(result.periods[0].orderCount).toBe(2);
		expect(result.periods[1].orderCount).toBe(1);
		expect(result.groupBy).toBe("week");
	});

	it("handles empty results", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await ordersByDateRange.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", group_by: "day" },
			makeCtx(queryFn),
		);

		expect(result.periods).toHaveLength(0);
	});

	it("calls shopify.query with correct date range filter", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		await ordersByDateRange.handler?.(
			{ start_date: "2026-03-01", end_date: "2026-03-15", group_by: "day" },
			makeCtx(queryFn),
		);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			first: 250,
			query: "created_at:>=2026-03-01 created_at:<=2026-03-15",
		});
	});
});
