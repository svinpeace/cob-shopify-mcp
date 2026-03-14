import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import refundRateSummary from "./refund-rate-summary.tool.js";

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

describe("refund_rate_summary", () => {
	it("has correct definition metadata", () => {
		expect(refundRateSummary.name).toBe("refund_rate_summary");
		expect(refundRateSummary.domain).toBe("analytics");
		expect(refundRateSummary.tier).toBe(1);
		expect(refundRateSummary.scopes).toEqual(["read_orders"]);
		expect(refundRateSummary.handler).toBeDefined();
	});

	it("computes refundRate = refundedOrders / totalOrders * 100", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
					refunds: [],
				},
				{
					id: "2",
					totalPriceSet: { shopMoney: { amount: "200.00", currencyCode: "USD" } },
					refunds: [{ id: "r1", totalRefundedSet: { shopMoney: { amount: "200.00" } } }],
				},
				{
					id: "3",
					totalPriceSet: { shopMoney: { amount: "150.00", currencyCode: "USD" } },
					refunds: [],
				},
				{
					id: "4",
					totalPriceSet: { shopMoney: { amount: "50.00", currencyCode: "USD" } },
					refunds: [{ id: "r2", totalRefundedSet: { shopMoney: { amount: "25.00" } } }],
				},
			]),
		);

		const result = await refundRateSummary.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalOrders).toBe(4);
		expect(result.refundedOrders).toBe(2);
		expect(result.refundRate).toBe(50);
		expect(result.totalRefundAmount).toBe(225);
		expect(result.currency).toBe("USD");
	});

	it("handles zero orders", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await refundRateSummary.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.totalOrders).toBe(0);
		expect(result.refundedOrders).toBe(0);
		expect(result.refundRate).toBe(0);
		expect(result.totalRefundAmount).toBe(0);
	});

	it("handles orders with no refunds", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					totalPriceSet: { shopMoney: { amount: "100.00", currencyCode: "USD" } },
					refunds: [],
				},
				{
					id: "2",
					totalPriceSet: { shopMoney: { amount: "200.00", currencyCode: "USD" } },
					refunds: [],
				},
			]),
		);

		const result = await refundRateSummary.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.refundRate).toBe(0);
		expect(result.totalRefundAmount).toBe(0);
	});

	it("handles multiple refunds on a single order", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				{
					id: "1",
					totalPriceSet: { shopMoney: { amount: "300.00", currencyCode: "USD" } },
					refunds: [
						{ id: "r1", totalRefundedSet: { shopMoney: { amount: "100.00" } } },
						{ id: "r2", totalRefundedSet: { shopMoney: { amount: "50.00" } } },
					],
				},
			]),
		);

		const result = await refundRateSummary.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31" },
			makeCtx(queryFn),
		);

		expect(result.refundedOrders).toBe(1);
		expect(result.totalRefundAmount).toBe(150);
	});
});
