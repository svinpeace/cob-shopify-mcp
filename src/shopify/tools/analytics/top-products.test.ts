import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import topProducts from "./top-products.tool.js";

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

function makeOrder(lineItems: any[]) {
	return {
		id: `order-${Math.random()}`,
		lineItems: {
			edges: lineItems.map((li) => ({ node: li })),
		},
	};
}

describe("top_products", () => {
	it("has correct definition metadata", () => {
		expect(topProducts.name).toBe("top_products");
		expect(topProducts.domain).toBe("analytics");
		expect(topProducts.tier).toBe(1);
		expect(topProducts.scopes).toEqual(["read_orders", "read_products"]);
		expect(topProducts.handler).toBeDefined();
	});

	it("sorts by revenue desc by default", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				makeOrder([
					{
						title: "Widget",
						quantity: 10,
						product: { id: "p1", title: "Widget" },
						originalTotalSet: { shopMoney: { amount: "50.00" } },
					},
					{
						title: "Gadget",
						quantity: 2,
						product: { id: "p2", title: "Gadget" },
						originalTotalSet: { shopMoney: { amount: "200.00" } },
					},
				]),
			]),
		);

		const result = await topProducts.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", sort_by: "revenue", limit: 10 },
			makeCtx(queryFn),
		);

		expect(result.products).toHaveLength(2);
		expect(result.products[0].productTitle).toBe("Gadget");
		expect(result.products[0].totalRevenue).toBe(200);
		expect(result.products[1].productTitle).toBe("Widget");
		expect(result.products[1].totalRevenue).toBe(50);
	});

	it("sorts by quantity when specified", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				makeOrder([
					{
						title: "Widget",
						quantity: 10,
						product: { id: "p1", title: "Widget" },
						originalTotalSet: { shopMoney: { amount: "50.00" } },
					},
					{
						title: "Gadget",
						quantity: 2,
						product: { id: "p2", title: "Gadget" },
						originalTotalSet: { shopMoney: { amount: "200.00" } },
					},
				]),
			]),
		);

		const result = await topProducts.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", sort_by: "quantity", limit: 10 },
			makeCtx(queryFn),
		);

		expect(result.products[0].productTitle).toBe("Widget");
		expect(result.products[0].totalQuantity).toBe(10);
	});

	it("aggregates across multiple orders for same product", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				makeOrder([
					{
						title: "Widget",
						quantity: 3,
						product: { id: "p1", title: "Widget" },
						originalTotalSet: { shopMoney: { amount: "30.00" } },
					},
				]),
				makeOrder([
					{
						title: "Widget",
						quantity: 5,
						product: { id: "p1", title: "Widget" },
						originalTotalSet: { shopMoney: { amount: "50.00" } },
					},
				]),
			]),
		);

		const result = await topProducts.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", sort_by: "revenue", limit: 10 },
			makeCtx(queryFn),
		);

		expect(result.products).toHaveLength(1);
		expect(result.products[0].totalRevenue).toBe(80);
		expect(result.products[0].totalQuantity).toBe(8);
		expect(result.products[0].orderCount).toBe(2);
	});

	it("respects limit parameter", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(
			makeOrdersResponse([
				makeOrder([
					{
						title: "A",
						quantity: 1,
						product: { id: "p1", title: "A" },
						originalTotalSet: { shopMoney: { amount: "100.00" } },
					},
					{
						title: "B",
						quantity: 1,
						product: { id: "p2", title: "B" },
						originalTotalSet: { shopMoney: { amount: "200.00" } },
					},
					{
						title: "C",
						quantity: 1,
						product: { id: "p3", title: "C" },
						originalTotalSet: { shopMoney: { amount: "300.00" } },
					},
				]),
			]),
		);

		const result = await topProducts.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", sort_by: "revenue", limit: 2 },
			makeCtx(queryFn),
		);

		expect(result.products).toHaveLength(2);
		expect(result.count).toBe(2);
	});

	it("handles empty results", async () => {
		const queryFn = vi.fn().mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await topProducts.handler?.(
			{ start_date: "2026-01-01", end_date: "2026-01-31", sort_by: "revenue", limit: 10 },
			makeCtx(queryFn),
		);

		expect(result.products).toHaveLength(0);
		expect(result.count).toBe(0);
	});
});
