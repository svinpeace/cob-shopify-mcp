import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: {
		name: "connect",
		description: "Connect a Shopify store via OAuth",
	},
	args: {
		store: {
			type: "string",
			description: "Store domain (e.g. my-store.myshopify.com)",
			required: true,
		},
	},
	async run({ args }) {
		const domain = args.store;

		if (!domain.endsWith(".myshopify.com")) {
			consola.error(`Invalid store domain: "${domain}". Expected format: my-store.myshopify.com`);
			process.exitCode = 1;
			return;
		}

		try {
			const { loadConfig } = await import("../../core/config/loader.js");
			const { createStorage } = await import("../../core/storage/factory.js");
			const { createAuthProvider } = await import("../../core/auth/factory.js");
			const { createLogger } = await import("../../core/observability/logger.js");

			const config = await loadConfig({
				auth: { store_domain: domain },
			});
			const logger = createLogger("connect", config.observability.log_level);
			const storage = await createStorage(config.storage, logger);
			await storage.initialize();

			if (config.auth.method === "token") {
				consola.info("Auth method is 'token'. Set the SHOPIFY_ACCESS_TOKEN environment variable to connect.");
				return;
			}

			if (config.auth.method === "client-credentials") {
				consola.info(
					"Auth method is 'client-credentials'. No manual connect step is needed — the server authenticates automatically.",
				);
				return;
			}

			// authorization-code flow
			const auth = createAuthProvider(config.auth, storage, logger);

			if (!("authorize" in auth)) {
				consola.error("Auth provider does not support the interactive authorization flow.");
				process.exitCode = 1;
				return;
			}

			consola.info(`Starting OAuth authorization for ${domain}...`);
			consola.info("A browser window will open. Approve the app to complete the connection.");

			const token = await (auth as { authorize: (domain: string) => Promise<string> }).authorize(domain);

			if (token) {
				consola.success(`Successfully connected to ${domain}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			consola.error(`Failed to connect store: ${message}`);
			process.exitCode = 1;
		}
	},
});
