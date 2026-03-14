import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all dependencies before importing bootstrap
const mockTransportStart = vi.fn().mockResolvedValue(undefined);
const mockTransportStop = vi.fn().mockResolvedValue(undefined);
const mockStorageInitialize = vi.fn().mockResolvedValue(undefined);
const mockStorageClose = vi.fn().mockResolvedValue(undefined);
const mockAuditInitialize = vi.fn().mockResolvedValue(undefined);
const mockAuditClose = vi.fn().mockResolvedValue(undefined);

vi.mock("@core/config/loader.js", () => ({
	loadConfig: vi.fn().mockResolvedValue({
		auth: {
			method: "token",
			store_domain: "test.myshopify.com",
			access_token: "shpat_test",
		},
		shopify: {
			api_version: "2025-01",
			max_retries: 3,
			cache: { read_ttl: 60, search_ttl: 30, analytics_ttl: 300 },
		},
		tools: {
			read_only: false,
			disable: [],
			enable: [],
			custom_paths: [],
		},
		transport: { type: "stdio", port: 3000, host: "0.0.0.0" },
		storage: { backend: "json", path: "/tmp/test-data.json", encrypt_tokens: false },
		observability: { log_level: "info", audit_log: false, metrics: false },
		rate_limit: { respect_shopify_cost: true, max_concurrent: 4 },
	}),
}));

vi.mock("@core/observability/logger.js", () => ({
	createLogger: vi.fn(() => ({
		info: vi.fn(),
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn().mockReturnThis(),
	})),
}));

vi.mock("@core/storage/factory.js", () => ({
	createStorage: vi.fn().mockResolvedValue({
		initialize: mockStorageInitialize,
		close: mockStorageClose,
		getToken: vi.fn(),
		setToken: vi.fn(),
		removeToken: vi.fn(),
		listStores: vi.fn(),
		getStore: vi.fn(),
		setStore: vi.fn(),
		removeStore: vi.fn(),
		getPersistedConfig: vi.fn(),
		setPersistedConfig: vi.fn(),
	}),
}));

vi.mock("@core/auth/factory.js", () => ({
	createAuthProvider: vi.fn(() => ({
		getToken: vi.fn().mockResolvedValue("shpat_test"),
	})),
}));

vi.mock("@core/observability/audit.js", () => {
	return {
		AuditLogger: class MockAuditLogger {
			initialize = mockAuditInitialize;
			close = mockAuditClose;
			log = vi.fn();
		},
	};
});

vi.mock("@shopify/client/factory.js", () => ({
	createShopifyClient: vi.fn(() => ({
		query: vi.fn().mockResolvedValue({ data: {}, cost: null }),
	})),
}));

vi.mock("@core/transport/factory.js", () => ({
	createTransport: vi.fn(() => ({
		start: mockTransportStart,
		stop: mockTransportStop,
	})),
}));

vi.mock("@core/registry/yaml-loader.js", () => ({
	loadYamlTools: vi.fn(() => []),
}));

const mockMcpServerTool = vi.fn();
const mockMcpServerResource = vi.fn();
const mockMcpServerPrompt = vi.fn();

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
	return {
		McpServer: class MockMcpServer {
			tool = mockMcpServerTool;
			resource = mockMcpServerResource;
			prompt = mockMcpServerPrompt;
		},
		ResourceTemplate: class MockResourceTemplate {
			constructor(
				public uriTemplate: string,
				public callbacks: unknown,
			) {}
		},
	};
});

describe("bootstrap", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("bootstrap creates McpServer and starts transport", async () => {
		const { bootstrap } = await import("./bootstrap.js");
		const { createTransport } = await import("@core/transport/factory.js");

		await bootstrap();

		expect(createTransport).toHaveBeenCalled();
		expect(mockTransportStart).toHaveBeenCalled();
	});

	it("bootstrap initializes storage", async () => {
		const { bootstrap } = await import("./bootstrap.js");

		await bootstrap();

		expect(mockStorageInitialize).toHaveBeenCalled();
	});

	it("bootstrap registers tools via registry", async () => {
		const { bootstrap } = await import("./bootstrap.js");

		await bootstrap();

		// Tools should have been registered on the McpServer instance
		expect(mockMcpServerTool).toHaveBeenCalled();
	});

	it("bootstrap starts transport", async () => {
		const { bootstrap } = await import("./bootstrap.js");

		await bootstrap();

		expect(mockTransportStart).toHaveBeenCalled();
	});
});
