import type { ShopifyCostData } from "@core/observability/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShopifyClientConfig } from "./types.js";

// Mock the @shopify/admin-api-client module
const mockRequest = vi.fn();
vi.mock("@shopify/admin-api-client", () => ({
	createAdminApiClient: vi.fn(() => ({
		request: mockRequest,
		config: {},
		getHeaders: () => ({}),
		getApiUrl: () => "",
	})),
}));

// Import after mock setup
import { ShopifyClient } from "./shopify-client.js";

function makeCostData(overrides: Partial<ShopifyCostData> = {}): ShopifyCostData {
	return {
		requestedQueryCost: 100,
		actualQueryCost: 50,
		throttleStatus: {
			maximumAvailable: 1000,
			currentlyAvailable: 950,
			restoreRate: 50,
		},
		...overrides,
	};
}

function makeConfig(overrides: Partial<ShopifyClientConfig> = {}): ShopifyClientConfig {
	return {
		storeDomain: "test.myshopify.com",
		apiVersion: "2026-01",
		authProvider: { getToken: vi.fn().mockResolvedValue("test-token") },
		costTracker: { recordCall: vi.fn() },
		logger: {
			debug: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		},
		rateLimit: { respectShopifyCost: false, maxConcurrent: 10 },
		...overrides,
	};
}

describe("ShopifyClient", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("query returns data and cost from response", async () => {
		const cost = makeCostData();
		mockRequest.mockResolvedValue({
			data: { products: { edges: [] } },
			extensions: { cost },
		});

		const config = makeConfig();
		const client = new ShopifyClient(config);
		const result = await client.query("{ products { edges { node { id } } } }");

		expect(result.data).toEqual({ products: { edges: [] } });
		expect(result.cost).toEqual(cost);
	});

	it("query handles missing extensions.cost (cost = null)", async () => {
		mockRequest.mockResolvedValue({
			data: { shop: { name: "Test" } },
		});

		const config = makeConfig();
		const client = new ShopifyClient(config);
		const result = await client.query("{ shop { name } }");

		expect(result.data).toEqual({ shop: { name: "Test" } });
		expect(result.cost).toBeNull();
	});

	it("query throws structured error for GraphQL errors array", async () => {
		mockRequest.mockResolvedValue({
			data: null,
			errors: {
				graphQLErrors: [{ message: "Field 'foo' not found" }, { message: "Syntax error" }],
			},
		});

		const config = makeConfig();
		const client = new ShopifyClient(config);

		await expect(client.query("{ foo }")).rejects.toThrow("GraphQL errors: Field 'foo' not found; Syntax error");
	});

	it("query reports cost to CostTracker", async () => {
		const cost = makeCostData();
		mockRequest.mockResolvedValue({
			data: { products: [] },
			extensions: { cost },
		});

		const config = makeConfig();
		const client = new ShopifyClient(config);
		await client.query("{ products { id } }");

		expect(config.costTracker.recordCall).toHaveBeenCalledWith(cost);
	});

	it("query caches read queries", async () => {
		const cost = makeCostData();
		mockRequest.mockResolvedValue({
			data: { products: [] },
			extensions: { cost },
		});

		const config = makeConfig({
			cache: { readTtl: 30, searchTtl: 10, analyticsTtl: 300 },
		});
		const client = new ShopifyClient(config);

		// First call
		await client.query("{ products { id } }", undefined, "read");
		// Second call - should be cached
		const result = await client.query("{ products { id } }", undefined, "read");

		expect(mockRequest).toHaveBeenCalledTimes(1);
		expect(result.data).toEqual({ products: [] });
	});

	it("query does not cache mutations", async () => {
		const cost = makeCostData();
		mockRequest.mockResolvedValue({
			data: { productUpdate: { product: { id: "1" } } },
			extensions: { cost },
		});

		const config = makeConfig();
		const client = new ShopifyClient(config);

		const mutation = "mutation { productUpdate(input: {}) { product { id } } }";
		await client.query(mutation, undefined, "mutation");
		await client.query(mutation, undefined, "mutation");

		expect(mockRequest).toHaveBeenCalledTimes(2);
	});
});
