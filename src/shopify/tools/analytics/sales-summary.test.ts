import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import salesSummary from "./sales-summary.tool.js";

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

describe("sales_summary", () => {
	it("has correct definition metadata", () => {
		expect(salesSummary.name).toBe("sales_summary");
		expect(salesSummary.domain).toBe("analytics");
		expect(salesSummary.tier).toBe(1);
		expect(salesSummary.scopes).toEqual(["read_orders"]);
		expect(salesSummary.handler).toBeDefined();
	});

	it("sums totalPriceSet across orders and computes average", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{ id: "1", totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } } },
				{ id: "2", totalPriceSet: { shopMoney: { amount: "200.50", currencyCode: "USD" } } },
				{ id: "3", totalPriceSet: { shopMoney: { amount: "50.25", currencyCode: "USD" } } },
			]),
		);

		const result = await salesSummary.handler?.({ start_date: "2026-01-01", end_date: "2026-01-31" }, makeCtx(queryFn));

		expect(result.totalSales).toBe(350.75);
		expect(result.orderCount).toBe(3);
		expect(result.averageOrderValue).toBe(116.92);
		expect(result.currency).toBe("USD");
	});

	it("handles empty results (zero orders)", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await salesSummary.handler?.({ start_date: "2026-01-01", end_date: "2026-01-31" }, makeCtx(queryFn));

		expect(result.totalSales).toBe(0);
		expect(result.orderCount).toBe(0);
		expect(result.averageOrderValue).toBe(0);
		expect(result.currency).toBe("USD");
	});

	it("calls shopify.query with correct date range filter", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		await salesSummary.handler?.({ start_date: "2026-03-01", end_date: "2026-03-15" }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			first: 250,
			query: "created_at:>=2026-03-01 created_at:<=2026-03-15",
		});
	});

	it("handles pagination", async () => {
		const queryFn = vi
			.fn()
			.mockResolvedValueOnce(
				makeOrdersResponse(
					[{ id: "1", totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } } }],
					true,
					"cursor1",
				),
			)
			.mockResolvedValueOnce(
				makeOrdersResponse([{ id: "2", totalPriceSet: { shopMoney: { amount: "200.00", currencyCode: "USD" } } }]),
			);

		const result = await salesSummary.handler?.({ start_date: "2026-01-01", end_date: "2026-01-31" }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledTimes(2);
		expect(result.totalSales).toBe(300);
		expect(result.orderCount).toBe(2);
	});
});
