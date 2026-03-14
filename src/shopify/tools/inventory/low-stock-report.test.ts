import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { describe, expect, it, vi } from "vitest";
import { lowStockReport } from "./low-stock-report.tool.js";

function makeCtx(queryFn: any): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {
			auth: { method: "token", store_domain: "test.myshopify.com", access_token: "tok" },
			shopify: { api_version: "2025-01", max_retries: 3, cache: { read_ttl: 300, search_ttl: 60, analytics_ttl: 900 } },
			tools: { read_only: false, disable: [], enable: [], custom_paths: [] },
			transport: { type: "stdio", port: 3000, host: "localhost" },
			storage: { backend: "json", path: "./data", encrypt_tokens: false },
			observability: { log_level: "info", audit_log: false, metrics: false },
			rate_limit: { respect_shopify_cost: true, max_concurrent: 5 },
		},
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: new CostTracker(),
	};
}

describe("low_stock_report", () => {
	it("has correct definition metadata", () => {
		expect(lowStockReport.name).toBe("low_stock_report");
		expect(lowStockReport.domain).toBe("inventory");
		expect(lowStockReport.tier).toBe(1);
		expect(lowStockReport.scopes).toEqual(["read_inventory", "read_products", "read_locations"]);
		expect(lowStockReport.input).toHaveProperty("threshold");
		expect(lowStockReport.input).toHaveProperty("limit");
	});

	it("filters items below threshold and returns count + sorted items", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges: [
					{
						node: {
							id: "gid://shopify/InventoryItem/1",
							sku: "HOOD-SM",
							tracked: true,
							variants: {
								nodes: [
									{
										id: "gid://shopify/ProductVariant/1",
										title: "Small / Black",
										displayName: "Classic Hoodie - Small / Black",
										product: { id: "gid://shopify/Product/1", title: "Classic Hoodie" },
									},
								],
							},
							inventoryLevels: {
								edges: [
									{
										node: {
											location: { id: "gid://shopify/Location/1", name: "Main Warehouse" },
											quantities: [{ name: "available", quantity: 3 }],
										},
									},
								],
							},
						},
					},
					{
						node: {
							id: "gid://shopify/InventoryItem/2",
							sku: "HOOD-LG",
							tracked: true,
							variants: {
								nodes: [
									{
										id: "gid://shopify/ProductVariant/2",
										title: "Large / Black",
										displayName: "Classic Hoodie - Large / Black",
										product: { id: "gid://shopify/Product/1", title: "Classic Hoodie" },
									},
								],
							},
							inventoryLevels: {
								edges: [
									{
										node: {
											location: { id: "gid://shopify/Location/1", name: "Main Warehouse" },
											quantities: [{ name: "available", quantity: 50 }],
										},
									},
								],
							},
						},
					},
					{
						node: {
							id: "gid://shopify/InventoryItem/3",
							sku: "TEE-SM",
							tracked: true,
							variants: {
								nodes: [
									{
										id: "gid://shopify/ProductVariant/3",
										title: "Small",
										displayName: "Basic Tee - Small",
										product: { id: "gid://shopify/Product/2", title: "Basic Tee" },
									},
								],
							},
							inventoryLevels: {
								edges: [
									{
										node: {
											location: { id: "gid://shopify/Location/1", name: "Main Warehouse" },
											quantities: [{ name: "available", quantity: 7 }],
										},
									},
								],
							},
						},
					},
				],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		});

		const result = await lowStockReport.handler?.({ threshold: 10, limit: 25 }, makeCtx(queryFn));

		expect(result.count).toBe(2);
		expect(result.threshold).toBe(10);
		expect(result.items).toHaveLength(2);
		// Sorted by available ascending
		expect(result.items[0].sku).toBe("HOOD-SM");
		expect(result.items[0].available).toBe(3);
		expect(result.items[0].productTitle).toBe("Classic Hoodie");
		expect(result.items[0].location).toBe("Main Warehouse");
		expect(result.items[1].sku).toBe("TEE-SM");
		expect(result.items[1].available).toBe(7);
	});

	it("handles empty inventory — returns count: 0", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges: [],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		});

		const result = await lowStockReport.handler?.({ threshold: 10, limit: 25 }, makeCtx(queryFn));

		expect(result.count).toBe(0);
		expect(result.threshold).toBe(10);
		expect(result.items).toEqual([]);
	});

	it("respects limit — trims results", async () => {
		const edges = Array.from({ length: 20 }, (_, i) => ({
			node: {
				id: `gid://shopify/InventoryItem/${i}`,
				sku: `SKU-${i}`,
				tracked: true,
				variants: {
					nodes: [
						{
							id: `gid://shopify/ProductVariant/${i}`,
							title: `Variant ${i}`,
							displayName: `Product - Variant ${i}`,
							product: { id: `gid://shopify/Product/${i}`, title: `Product ${i}` },
						},
					],
				},
				inventoryLevels: {
					edges: [
						{
							node: {
								location: { id: "gid://shopify/Location/1", name: "Warehouse" },
								quantities: [{ name: "available", quantity: i }],
							},
						},
					],
				},
			},
		}));

		const queryFn = vi.fn().mockResolvedValue({
			inventoryItems: {
				edges,
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		});

		const result = await lowStockReport.handler?.({ threshold: 100, limit: 5 }, makeCtx(queryFn));

		expect(result.count).toBe(5);
		expect(result.items).toHaveLength(5);
		// Should be sorted ascending
		expect(result.items[0].available).toBe(0);
		expect(result.items[4].available).toBe(4);
	});

	it("paginates through multiple pages", async () => {
		const queryFn = vi
			.fn()
			.mockResolvedValueOnce({
				inventoryItems: {
					edges: [
						{
							node: {
								id: "gid://shopify/InventoryItem/1",
								sku: "P1",
								tracked: true,
								variants: {
									nodes: [
										{
											id: "gid://shopify/ProductVariant/1",
											title: "Default",
											displayName: "Product 1",
											product: { id: "gid://shopify/Product/1", title: "Product 1" },
										},
									],
								},
								inventoryLevels: {
									edges: [
										{
											node: {
												location: { id: "gid://shopify/Location/1", name: "W1" },
												quantities: [{ name: "available", quantity: 2 }],
											},
										},
									],
								},
							},
						},
					],
					pageInfo: { hasNextPage: true, endCursor: "page2" },
				},
			})
			.mockResolvedValueOnce({
				inventoryItems: {
					edges: [
						{
							node: {
								id: "gid://shopify/InventoryItem/2",
								sku: "P2",
								tracked: true,
								variants: {
									nodes: [
										{
											id: "gid://shopify/ProductVariant/2",
											title: "Default",
											displayName: "Product 2",
											product: { id: "gid://shopify/Product/2", title: "Product 2" },
										},
									],
								},
								inventoryLevels: {
									edges: [
										{
											node: {
												location: { id: "gid://shopify/Location/1", name: "W1" },
												quantities: [{ name: "available", quantity: 1 }],
											},
										},
									],
								},
							},
						},
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			});

		const result = await lowStockReport.handler?.({ threshold: 10, limit: 25 }, makeCtx(queryFn));

		expect(queryFn).toHaveBeenCalledTimes(2);
		expect(result.count).toBe(2);
		// Sorted ascending
		expect(result.items[0].sku).toBe("P2");
		expect(result.items[0].available).toBe(1);
		expect(result.items[1].sku).toBe("P1");
		expect(result.items[1].available).toBe(2);
	});
});
