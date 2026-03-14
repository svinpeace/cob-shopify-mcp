import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineCommand } from "citty";
import { consola } from "consola";

const TEMPLATE = `# cob-shopify-mcp configuration
# See https://github.com/callobuzz/cob-shopify-mcp for documentation

auth:
  # method: token | client-credentials | authorization-code
  method: token
  store_domain: "\${SHOPIFY_STORE_DOMAIN}"
  access_token: "\${SHOPIFY_ACCESS_TOKEN}"
  # client_id: "\${SHOPIFY_CLIENT_ID}"
  # client_secret: "\${SHOPIFY_CLIENT_SECRET}"

shopify:
  api_version: "2026-01"
  max_retries: 3
  cache:
    read_ttl: 30
    search_ttl: 10
    analytics_ttl: 300

tools:
  read_only: false
  disable: []
  enable: []
  # custom_paths: []

transport:
  type: stdio
  port: 3000
  host: "0.0.0.0"

storage:
  backend: json
  path: "~/.cob-shopify-mcp/"
  encrypt_tokens: false

observability:
  log_level: info
  audit_log: true
  metrics: false

rate_limit:
  respect_shopify_cost: true
  max_concurrent: 10
`;

export default defineCommand({
	meta: {
		name: "init",
		description: "Create a starter config file in the current directory",
	},
	async run() {
		const filePath = resolve(process.cwd(), "cob-shopify-mcp.config.yaml");

		if (existsSync(filePath)) {
			consola.warn(`Config file already exists: ${filePath}`);
			process.exitCode = 1;
			return;
		}

		writeFileSync(filePath, TEMPLATE, "utf-8");
		consola.success(`Created ${filePath}`);
	},
});
