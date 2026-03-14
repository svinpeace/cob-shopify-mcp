import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import inventoryRiskReport from "./inventory-risk-report.tool.js";

function makeCtx(queryFn: ReturnType<typeof vi.fn>): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

function makeInventoryResponse(variants: any[], hasNextPage = false, endCursor: string | null = null) {
	return {
		data: {
			productVariants: {
				edges: variants.map((v) => ({ node: v })),
				pageInfo: { hasNextPage, endCursor },
			},
		},
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

describe("inventory_risk_report", () => {
	it("has correct definition metadata", () => {
		expect(inventoryRiskReport.name).toBe("inventory_risk_report");
		expect(inventoryRiskReport.domain).toBe("analytics");
		expect(inventoryRiskReport.tier).toBe(1);
		expect(inventoryRiskReport.scopes).toEqual(["read_inventory", "read_products"]);
		expect(inventoryRiskReport.handler).toBeDefined();
	});

	it("classifies items based on days_of_stock_threshold", async () => {
		const queryFn = vi
			.fn()
			// First call: inventory query
			.mockResolvedValueOnce(
				makeInventoryResponse([
					{
						id: "v1",
						title: "Small",
						sku: "W-S",
						inventoryQuantity: 5,
						product: { id: "p1", title: "Widget" },
					},
					{
						id: "v2",
						title: "Large",
						sku: "W-L",
						inventoryQuantity: 500,
						product: { id: "p1", title: "Widget" },
					},
					{
						id: "v3",
						title: "Default",
						sku: "G-D",
						inventoryQuantity: 50,
						product: { id: "p2", title: "Gadget" },
					},
				]),
			)
			// Second call: sales query
			.mockResolvedValueOnce(
				makeOrdersResponse([
					{
						lineItems: {
							edges: [
								{ node: { quantity: 10, variant: { id: "v1" } } }, // v1: 10 sold in 30d = 0.33/day, 5/0.33 = ~15 days -> understock
								{ node: { quantity: 1, variant: { id: "v2" } } }, // v2: 1 sold in 30d = 0.033/day, 500/0.033 = ~15000 days -> overstock
								{ node: { quantity: 1, variant: { id: "v3" } } }, // v3: 1 sold in 30d = 0.033/day, 50/0.033 = ~1500 days -> overstock
							],
						},
					},
				]),
			);

		const result = await inventoryRiskReport.handler?.({ days_of_stock_threshold: 30, limit: 25 }, makeCtx(queryFn));

		expect(result.items.length).toBe(3);

		const v1 = result.items.find((i: any) => i.variantId === "v1");
		expect(v1.riskCategory).toBe("understock");

		const v2 = result.items.find((i: any) => i.variantId === "v2");
		expect(v2.riskCategory).toBe("overstock");

		const v3 = result.items.find((i: any) => i.variantId === "v3");
		expect(v3.riskCategory).toBe("overstock");

		// understock items come first
		expect(result.items[0].riskCategory).toBe("understock");
	});

	it("handles empty inventory", async () => {
		const queryFn = vi
			.fn()
			.mockResolvedValueOnce(makeInventoryResponse([]))
			.mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await inventoryRiskReport.handler?.({ days_of_stock_threshold: 30, limit: 25 }, makeCtx(queryFn));

		expect(result.items).toHaveLength(0);
		expect(result.summary.totalVariants).toBe(0);
	});

	it("classifies zero-inventory items as understock", async () => {
		const queryFn = vi
			.fn()
			.mockResolvedValueOnce(
				makeInventoryResponse([
					{
						id: "v1",
						title: "Default",
						sku: "X-1",
						inventoryQuantity: 0,
						product: { id: "p1", title: "Out of Stock Item" },
					},
				]),
			)
			.mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await inventoryRiskReport.handler?.({ days_of_stock_threshold: 30, limit: 25 }, makeCtx(queryFn));

		expect(result.items[0].riskCategory).toBe("understock");
		expect(result.items[0].inventoryQuantity).toBe(0);
	});

	it("returns summary with category counts", async () => {
		const queryFn = vi
			.fn()
			.mockResolvedValueOnce(
				makeInventoryResponse([
					{ id: "v1", title: "A", sku: "A", inventoryQuantity: 2, product: { id: "p1", title: "A" } },
					{ id: "v2", title: "B", sku: "B", inventoryQuantity: 1000, product: { id: "p2", title: "B" } },
					{ id: "v3", title: "C", sku: "C", inventoryQuantity: 45, product: { id: "p3", title: "C" } },
				]),
			)
			.mockResolvedValueOnce(
				makeOrdersResponse([
					{
						lineItems: {
							edges: [
								{ node: { quantity: 5, variant: { id: "v1" } } },
								{ node: { quantity: 1, variant: { id: "v3" } } },
							],
						},
					},
				]),
			);

		const result = await inventoryRiskReport.handler?.({ days_of_stock_threshold: 30, limit: 25 }, makeCtx(queryFn));

		expect(result.summary.totalVariants).toBe(3);
		expect(result.summary.understock + result.summary.overstock + result.summary.healthy).toBe(3);
	});

	it("respects limit parameter", async () => {
		const variants = Array.from({ length: 10 }, (_, i) => ({
			id: `v${i}`,
			title: `Var ${i}`,
			sku: `S-${i}`,
			inventoryQuantity: 100,
			product: { id: `p${i}`, title: `Product ${i}` },
		}));

		const queryFn = vi
			.fn()
			.mockResolvedValueOnce(makeInventoryResponse(variants))
			.mockResolvedValueOnce(makeOrdersResponse([]));

		const result = await inventoryRiskReport.handler?.({ days_of_stock_threshold: 30, limit: 3 }, makeCtx(queryFn));

		expect(result.items).toHaveLength(3);
		// Summary still reflects all variants
		expect(result.summary.totalVariants).toBe(10);
	});
});
