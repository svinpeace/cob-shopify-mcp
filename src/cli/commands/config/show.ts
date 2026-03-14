import { defineCommand } from "citty";
import { consola } from "consola";
import { maskSecret } from "../../utils.js";

export default defineCommand({
	meta: { name: "show", description: "Show current configuration" },
	async run() {
		const { loadConfig, _resetConfig } = await import("../../../core/config/loader.js");
		_resetConfig();

		try {
			const config = await loadConfig();
			consola.info("Current configuration:\n");

			const lines: string[] = [];

			lines.push("auth:");
			lines.push(`  method: ${config.auth.method}`);
			lines.push(`  store_domain: ${config.auth.store_domain || "(not set)"}`);
			if (config.auth.access_token) {
				lines.push(`  access_token: ${maskSecret(config.auth.access_token)}`);
			}
			if (config.auth.client_id) {
				lines.push(`  client_id: ${maskSecret(config.auth.client_id)}`);
			}
			if (config.auth.client_secret) {
				lines.push(`  client_secret: ${maskSecret(config.auth.client_secret)}`);
			}

			lines.push("shopify:");
			lines.push(`  api_version: ${config.shopify.api_version}`);
			lines.push(`  max_retries: ${config.shopify.max_retries}`);
			lines.push("  cache:");
			lines.push(`    read_ttl: ${config.shopify.cache.read_ttl}`);
			lines.push(`    search_ttl: ${config.shopify.cache.search_ttl}`);
			lines.push(`    analytics_ttl: ${config.shopify.cache.analytics_ttl}`);

			lines.push("tools:");
			lines.push(`  read_only: ${config.tools.read_only}`);
			lines.push(`  disable: [${config.tools.disable.join(", ")}]`);
			lines.push(`  enable: [${config.tools.enable.join(", ")}]`);

			lines.push("transport:");
			lines.push(`  type: ${config.transport.type}`);
			lines.push(`  port: ${config.transport.port}`);
			lines.push(`  host: ${config.transport.host}`);

			lines.push("storage:");
			lines.push(`  backend: ${config.storage.backend}`);
			lines.push(`  path: ${config.storage.path}`);
			lines.push(`  encrypt_tokens: ${config.storage.encrypt_tokens}`);

			lines.push("observability:");
			lines.push(`  log_level: ${config.observability.log_level}`);
			lines.push(`  audit_log: ${config.observability.audit_log}`);
			lines.push(`  metrics: ${config.observability.metrics}`);

			lines.push("rate_limit:");
			lines.push(`  respect_shopify_cost: ${config.rate_limit.respect_shopify_cost}`);
			lines.push(`  max_concurrent: ${config.rate_limit.max_concurrent}`);

			process.stderr.write(`${lines.join("\n")}\n`);
		} catch (err) {
			consola.error("Failed to load config:", err instanceof Error ? err.message : String(err));
			process.exitCode = 1;
		}
	},
});
