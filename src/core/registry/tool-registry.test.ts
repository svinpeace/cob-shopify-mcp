import { describe, expect, it, vi } from "vitest";
import type { CobConfig } from "../config/types.js";
import type { ToolDefinition } from "../engine/types.js";
import { RESERVED_DOMAINS, ToolRegistry } from "./tool-registry.js";

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		name: "test_tool",
		domain: "products",
		tier: 1,
		description: "A test tool",
		scopes: ["read_products"],
		input: {},
		graphql: "query { products { id } }",
		...overrides,
	};
}

function makeConfig(overrides: Partial<CobConfig["tools"]> = {}): CobConfig {
	return {
		auth: {
			method: "token",
			store_domain: "test.myshopify.com",
			access_token: "shpat_test",
		},
		shopify: {
			api_version: "2025-01",
			max_retries: 3,
			cache: { read_ttl: 300, search_ttl: 60, analytics_ttl: 900 },
		},
		tools: {
			read_only: false,
			disable: [],
			enable: [],
			custom_paths: [],
			...overrides,
		},
		transport: { type: "stdio", port: 3000, host: "localhost" },
		storage: { backend: "json", path: "./data", encrypt_tokens: false },
		observability: { log_level: "info", audit_log: false, metrics: false },
		rate_limit: { respect_shopify_cost: true, max_concurrent: 5 },
	};
}

describe("ToolRegistry", () => {
	it("register + get roundtrip returns correct tool", () => {
		const registry = new ToolRegistry();
		const tool = makeTool({ name: "list_products" });
		registry.register(tool);
		expect(registry.get("list_products")).toBe(tool);
	});

	it("register throws on duplicate name", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "dup_tool" }));
		expect(() => registry.register(makeTool({ name: "dup_tool" }))).toThrow('"dup_tool" is already registered');
	});

	it("getAll returns all registered tools", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tool_a" }));
		registry.register(makeTool({ name: "tool_b" }));
		expect(registry.getAll()).toHaveLength(2);
	});

	it("getByDomain returns only matching domain tools", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "t1", domain: "products" }));
		registry.register(makeTool({ name: "t2", domain: "orders" }));
		registry.register(makeTool({ name: "t3", domain: "products" }));
		const products = registry.getByDomain("products");
		expect(products).toHaveLength(2);
		expect(products.every((t) => t.domain === "products")).toBe(true);
	});

	it("filter with read_only=true excludes write_ scope tools", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "write_tool", scopes: ["write_products"] }));
		const result = registry.filter(makeConfig({ read_only: true }));
		expect(result.find((t) => t.name === "write_tool")).toBeUndefined();
	});

	it("filter with read_only=true keeps read-only tools", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "read_tool", scopes: ["read_products"] }));
		const result = registry.filter(makeConfig({ read_only: true }));
		expect(result.find((t) => t.name === "read_tool")).toBeDefined();
	});

	it("filter excludes tools in disable list", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "disabled_tool" }));
		const result = registry.filter(makeConfig({ disable: ["disabled_tool"] }));
		expect(result.find((t) => t.name === "disabled_tool")).toBeUndefined();
	});

	it("filter includes tier 2 tool when in enable list", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier2_tool", tier: 2 }));
		const result = registry.filter(makeConfig({ enable: ["tier2_tool"] }));
		expect(result.find((t) => t.name === "tier2_tool")).toBeDefined();
	});

	it("filter enables tier 1 by default", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier1_tool", tier: 1 }));
		const result = registry.filter(makeConfig());
		expect(result.find((t) => t.name === "tier1_tool")).toBeDefined();
	});

	it("filter disables tier 2 by default", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier2_tool", tier: 2 }));
		const result = registry.filter(makeConfig());
		expect(result.find((t) => t.name === "tier2_tool")).toBeUndefined();
	});

	it("filter enables tier 3 by default", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier3_tool", tier: 3 }));
		const result = registry.filter(makeConfig());
		expect(result.find((t) => t.name === "tier3_tool")).toBeDefined();
	});

	it("precedence: read_only overrides enable list", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "write_tool", scopes: ["write_products"], tier: 1 }));
		const result = registry.filter(makeConfig({ read_only: true, enable: ["write_tool"] }));
		expect(result.find((t) => t.name === "write_tool")).toBeUndefined();
	});

	it("precedence: disable overrides tier default enable", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier1_tool", tier: 1 }));
		const result = registry.filter(makeConfig({ disable: ["tier1_tool"] }));
		expect(result.find((t) => t.name === "tier1_tool")).toBeUndefined();
	});

	it("precedence: enable overrides tier default disable", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "tier2_tool", tier: 2 }));
		const result = registry.filter(makeConfig({ enable: ["tier2_tool"] }));
		expect(result.find((t) => t.name === "tier2_tool")).toBeDefined();
	});

	it("tier 3 tool overrides existing built-in tool with same name", () => {
		const registry = new ToolRegistry();
		const builtIn = makeTool({ name: "list_products", tier: 1 });
		const custom = makeTool({ name: "list_products", tier: 3, domain: "custom", description: "Custom override" });
		registry.register(builtIn);
		registry.register(custom);
		const result = registry.get("list_products");
		expect(result).toBe(custom);
		expect(result?.tier).toBe(3);
	});

	it("two non-tier-3 tools with same name throws error", () => {
		const registry = new ToolRegistry();
		registry.register(makeTool({ name: "dup_tool", tier: 1 }));
		expect(() => registry.register(makeTool({ name: "dup_tool", tier: 2 }))).toThrow(
			'"dup_tool" is already registered',
		);
	});

	it("tier 3 tool with reserved domain is silently skipped", () => {
		const registry = new ToolRegistry();
		const custom = makeTool({ name: "my_custom_tool", tier: 3, domain: "tools" });
		registry.register(custom);
		expect(registry.get("my_custom_tool")).toBeUndefined();
		expect(registry.getAll()).toHaveLength(0);
	});

	it("tier 1 tool with reserved domain is allowed", () => {
		const registry = new ToolRegistry();
		const builtIn = makeTool({ name: "connect_store", tier: 1, domain: "connect" });
		registry.register(builtIn);
		expect(registry.get("connect_store")).toBe(builtIn);
	});

	it("console.warn is called when tier 3 tool overrides built-in", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			const registry = new ToolRegistry();
			registry.register(makeTool({ name: "list_products", tier: 1 }));
			registry.register(makeTool({ name: "list_products", tier: 3, domain: "custom" }));
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Custom tool "list_products" overrides built-in tool'),
			);
		} finally {
			warnSpy.mockRestore();
		}
	});

	it("console.warn is called when tier 3 tool has reserved domain", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			const registry = new ToolRegistry();
			registry.register(makeTool({ name: "bad_tool", tier: 3, domain: "config" }));
			expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Domain "config" is reserved'));
		} finally {
			warnSpy.mockRestore();
		}
	});

	it("RESERVED_DOMAINS contains expected domains", () => {
		expect(RESERVED_DOMAINS.has("start")).toBe(true);
		expect(RESERVED_DOMAINS.has("connect")).toBe(true);
		expect(RESERVED_DOMAINS.has("config")).toBe(true);
		expect(RESERVED_DOMAINS.has("tools")).toBe(true);
		expect(RESERVED_DOMAINS.has("stores")).toBe(true);
		expect(RESERVED_DOMAINS.has("products")).toBe(false);
	});
});
