import { createAuthProvider } from "@core/auth/factory.js";
import { _resetConfig, loadConfig } from "@core/config/loader.js";
import { ToolEngine } from "@core/engine/tool-engine.js";
import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { createLogger } from "@core/observability/logger.js";
import { ToolRegistry } from "@core/registry/tool-registry.js";
import { createStorage } from "@core/storage/factory.js";
import type { StorageBackend } from "@core/storage/storage.interface.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createShopifyClient } from "@shopify/client/factory.js";
import { afterAll, describe, expect, it } from "vitest";
import { skipIfNoCredentials } from "../test/integration-helpers.js";
import { getAllTools } from "./get-all-tools.js";
import { registerTools } from "./register-tools.js";

describe.skipIf(skipIfNoCredentials())("Server Bootstrap Integration", () => {
	let storage: StorageBackend;

	afterAll(async () => {
		if (storage) {
			await storage.close();
		}
		_resetConfig();
	});

	it("bootstraps core components without error", async () => {
		_resetConfig();
		const config = await loadConfig({
			auth: {
				method: "token",
				store_domain: process.env.SHOPIFY_STORE_DOMAIN!,
				access_token: process.env.SHOPIFY_ACCESS_TOKEN!,
			},
			storage: { backend: "json", path: "./test-data/", encrypt_tokens: false },
			observability: { log_level: "warn", audit_log: false, metrics: false },
		});

		const logger = createLogger("bootstrap-test", "warn");
		storage = await createStorage(config.storage, logger);
		await storage.initialize();
		const auth = createAuthProvider(config.auth, storage, logger);
		const costTracker = new CostTracker();

		const shopify = createShopifyClient({
			storeDomain: config.auth.store_domain,
			apiVersion: config.shopify.api_version,
			authProvider: auth,
			costTracker,
			logger,
			cache: { readTtl: 0, searchTtl: 0, analyticsTtl: 0 },
			rateLimit: { respectShopifyCost: true, maxConcurrent: 2 },
		});

		const _ctx: ExecutionContext = { shopify, config, storage, logger, costTracker };
		const registry = new ToolRegistry();
		const _engine = new ToolEngine(registry);

		const allTools = getAllTools();
		for (const tool of allTools) {
			registry.register(tool);
		}

		expect(allTools.length).toBeGreaterThan(0);
		expect(registry.getAll().length).toBe(allTools.length);
	});

	it("creates McpServer with tools registered", async () => {
		_resetConfig();
		const config = await loadConfig({
			auth: {
				method: "token",
				store_domain: process.env.SHOPIFY_STORE_DOMAIN!,
				access_token: process.env.SHOPIFY_ACCESS_TOKEN!,
			},
			storage: { backend: "json", path: "./test-data/", encrypt_tokens: false },
			observability: { log_level: "warn", audit_log: false, metrics: false },
		});

		const logger = createLogger("bootstrap-test", "warn");
		storage = await createStorage(config.storage, logger);
		await storage.initialize();
		const auth = createAuthProvider(config.auth, storage, logger);
		const costTracker = new CostTracker();

		const shopify = createShopifyClient({
			storeDomain: config.auth.store_domain,
			apiVersion: config.shopify.api_version,
			authProvider: auth,
			costTracker,
			logger,
			cache: { readTtl: 0, searchTtl: 0, analyticsTtl: 0 },
			rateLimit: { respectShopifyCost: true, maxConcurrent: 2 },
		});

		const ctx: ExecutionContext = { shopify, config, storage, logger, costTracker };
		const registry = new ToolRegistry();
		const engine = new ToolEngine(registry);

		const allTools = getAllTools();
		for (const tool of allTools) {
			registry.register(tool);
		}

		const server = new McpServer({
			name: "cob-shopify-mcp",
			version: "1.0.0",
		});

		// Should register tools without throwing
		expect(() => registerTools(server, registry, engine, config, ctx)).not.toThrow();
	});

	it("tool registry filters read-only tools correctly", async () => {
		_resetConfig();
		const config = await loadConfig({
			auth: {
				method: "token",
				store_domain: process.env.SHOPIFY_STORE_DOMAIN!,
				access_token: process.env.SHOPIFY_ACCESS_TOKEN!,
			},
			tools: { read_only: true },
			storage: { backend: "json", path: "./test-data/", encrypt_tokens: false },
			observability: { log_level: "warn", audit_log: false, metrics: false },
		});

		const registry = new ToolRegistry();
		const allTools = getAllTools();
		for (const tool of allTools) {
			registry.register(tool);
		}

		const filteredTools = registry.filter(config);
		const writeTools = filteredTools.filter((t) => t.scopes.some((s) => s.startsWith("write_")));
		expect(writeTools).toHaveLength(0);
		expect(filteredTools.length).toBeLessThan(allTools.length);
	});
});
