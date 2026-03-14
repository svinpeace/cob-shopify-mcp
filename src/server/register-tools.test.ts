import type { CobConfig } from "@core/config/types.js";
import { ToolEngine } from "@core/engine/tool-engine.js";
import type { ExecutionContext, ToolDefinition } from "@core/engine/types.js";
import { ToolRegistry } from "@core/registry/tool-registry.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { registerTools } from "./register-tools.js";

function createMockServer() {
	return {
		tool: vi.fn(),
		resource: vi.fn(),
		prompt: vi.fn(),
	};
}

function createMockConfig(overrides?: Partial<CobConfig["tools"]>): CobConfig {
	return {
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
			...overrides,
		},
		transport: { type: "stdio", port: 3000, host: "0.0.0.0" },
		storage: { backend: "json", path: "~/.cob-shopify-mcp/data.json", encrypt_tokens: false },
		observability: { log_level: "info", audit_log: false, metrics: false },
		rate_limit: { respect_shopify_cost: true, max_concurrent: 4 },
	};
}

function createMockTool(name: string, tier: 1 | 2 | 3 = 1, scopes: string[] = ["read_products"]): ToolDefinition {
	return {
		name,
		domain: "products",
		tier,
		description: `Test tool: ${name}`,
		scopes,
		input: { id: z.string() },
		handler: async () => ({ id: "123" }),
	};
}

describe("registerTools", () => {
	let mockServer: ReturnType<typeof createMockServer>;
	let registry: ToolRegistry;
	let config: CobConfig;
	let ctx: ExecutionContext;
	let engine: ToolEngine;

	beforeEach(() => {
		mockServer = createMockServer();
		registry = new ToolRegistry();
		config = createMockConfig();
		ctx = {
			shopify: { query: vi.fn() },
			config,
			storage: {} as any,
			logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any,
			costTracker: { recordCall: vi.fn(), getSessionStats: vi.fn(), getCostSummary: vi.fn() } as any,
		};
		engine = new ToolEngine(registry);
	});

	it("registers enabled tools with McpServer.tool()", () => {
		const tool1 = createMockTool("list-products");
		const tool2 = createMockTool("get-product");
		registry.register(tool1);
		registry.register(tool2);

		registerTools(mockServer as any, registry, engine, config, ctx);

		expect(mockServer.tool).toHaveBeenCalledTimes(2);
		expect(mockServer.tool.mock.calls[0][0]).toBe("list-products");
		expect(mockServer.tool.mock.calls[1][0]).toBe("get-product");
	});

	it("config filter excludes disabled tools", () => {
		const tool1 = createMockTool("list-products");
		const tool2 = createMockTool("get-product");
		registry.register(tool1);
		registry.register(tool2);

		config = createMockConfig({ disable: ["get-product"] });

		registerTools(mockServer as any, registry, engine, config, ctx);

		expect(mockServer.tool).toHaveBeenCalledTimes(1);
		expect(mockServer.tool.mock.calls[0][0]).toBe("list-products");
	});

	it("config filter excludes tier-2 tools by default", () => {
		const tool1 = createMockTool("list-products", 1);
		const tool2 = createMockTool("advanced-tool", 2);
		registry.register(tool1);
		registry.register(tool2);

		registerTools(mockServer as any, registry, engine, config, ctx);

		expect(mockServer.tool).toHaveBeenCalledTimes(1);
		expect(mockServer.tool.mock.calls[0][0]).toBe("list-products");
	});

	it("tool handler delegates to ToolEngine.execute()", async () => {
		const tool = createMockTool("list-products");
		registry.register(tool);

		registerTools(mockServer as any, registry, engine, config, ctx);

		// Extract the registered handler callback (4th argument)
		const handler = mockServer.tool.mock.calls[0][3];
		const result = await handler({ id: "gid://shopify/Product/1" });

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(JSON.parse(result.content[0].text)).toEqual({ id: "123" });
		expect(result.isError).toBe(false);
	});

	it("read_only config excludes write tools", () => {
		const readTool = createMockTool("list-products", 1, ["read_products"]);
		const writeTool = createMockTool("create-product", 1, ["write_products"]);
		registry.register(readTool);
		registry.register(writeTool);

		config = createMockConfig({ read_only: true });

		registerTools(mockServer as any, registry, engine, config, ctx);

		expect(mockServer.tool).toHaveBeenCalledTimes(1);
		expect(mockServer.tool.mock.calls[0][0]).toBe("list-products");
	});
});
