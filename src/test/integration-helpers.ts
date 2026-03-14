import { createAuthProvider } from "@core/auth/factory.js";
import { _resetConfig, loadConfig } from "@core/config/loader.js";
import { ToolEngine } from "@core/engine/tool-engine.js";
import type { ExecutionContext } from "@core/engine/types.js";
import { CostTracker } from "@core/observability/cost-tracker.js";
import { createLogger } from "@core/observability/logger.js";
import { ToolRegistry } from "@core/registry/tool-registry.js";
import { createStorage } from "@core/storage/factory.js";
import type { StorageBackend } from "@core/storage/storage.interface.js";
import { createShopifyClient } from "@shopify/client/factory.js";

export function skipIfNoCredentials(): boolean {
	if (!process.env.SHOPIFY_ACCESS_TOKEN || !process.env.SHOPIFY_STORE_DOMAIN) {
		return true;
	}
	return false;
}

export interface IntegrationContext {
	ctx: ExecutionContext;
	registry: ToolRegistry;
	engine: ToolEngine;
	storage: StorageBackend;
}

export async function createIntegrationContext(): Promise<IntegrationContext> {
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

	const logger = createLogger("integration-test", "warn");
	const storage = await createStorage(config.storage, logger);
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

	return { ctx, registry, engine, storage };
}

export async function cleanupIntegrationContext(context: IntegrationContext): Promise<void> {
	await context.storage.close();
	_resetConfig();
}
