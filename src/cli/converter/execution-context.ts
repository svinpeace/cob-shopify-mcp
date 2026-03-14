/**
 * Shared execution context factory.
 *
 * Extracts the infrastructure boot logic from `tools run` into a reusable
 * function so that every tool-derived CLI command can share the same setup.
 */

import type { ToolEngine } from "../../core/engine/tool-engine.js";
import type { ExecutionContext } from "../../core/engine/types.js";
import type { ToolRegistry } from "../../core/registry/tool-registry.js";

export interface ExecutionBundle {
	ctx: ExecutionContext;
	registry: ToolRegistry;
	engine: ToolEngine;
}

/**
 * Creates the full execution context needed to run any tool.
 *
 * Steps:
 * 1. Load config (with cache reset)
 * 2. Create logger
 * 3. Create + initialize storage
 * 4. Create auth provider
 * 5. Create cost tracker
 * 6. Create Shopify client
 * 7. Build ExecutionContext
 * 8. Create ToolRegistry + load all tools (built-in + custom YAML)
 * 9. Create ToolEngine
 * 10. Return { ctx, registry, engine }
 */
export async function createExecutionContext(): Promise<ExecutionBundle> {
	const { loadConfig, _resetConfig } = await import("../../core/config/loader.js");
	const { ToolRegistry } = await import("../../core/registry/tool-registry.js");
	const { ToolEngine } = await import("../../core/engine/tool-engine.js");
	const { getAllTools } = await import("../../server/get-all-tools.js");
	const { loadYamlTools } = await import("../../core/registry/yaml-loader.js");
	const { createAuthProvider } = await import("../../core/auth/factory.js");
	const { createShopifyClient } = await import("../../shopify/client/factory.js");
	const { CostTracker } = await import("../../core/observability/cost-tracker.js");
	const { createLogger } = await import("../../core/observability/logger.js");
	const { createStorage } = await import("../../core/storage/factory.js");

	_resetConfig();

	const config = await loadConfig();
	const logger = createLogger(config.observability.log_level);

	// Build registry with all tools (built-in + custom YAML)
	const registry = new ToolRegistry();
	const allTools = getAllTools();
	for (const tool of allTools) {
		registry.register(tool);
	}

	// Load custom YAML tools
	if (config.tools.custom_paths.length > 0) {
		const yamlTools = loadYamlTools(config.tools.custom_paths);
		for (const tool of yamlTools) {
			registry.register(tool);
		}
	}

	// Boot storage, auth, shopify client
	const storage = await createStorage(config.storage, logger);
	await storage.initialize();
	const costTracker = new CostTracker();
	const authProvider = createAuthProvider(config.auth, storage, logger);
	const shopifyClient = createShopifyClient({
		storeDomain: config.auth.store_domain,
		apiVersion: config.shopify.api_version,
		authProvider,
		costTracker,
		logger,
		cache: {
			readTtl: config.shopify.cache.read_ttl,
			searchTtl: config.shopify.cache.search_ttl,
			analyticsTtl: config.shopify.cache.analytics_ttl,
		},
	});

	// Create execution context
	const ctx: ExecutionContext = {
		shopify: shopifyClient,
		config,
		storage,
		logger,
		costTracker,
	};

	const engine = new ToolEngine(registry);

	return { ctx, registry, engine };
}
