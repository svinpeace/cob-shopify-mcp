import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: { name: "remove", description: "Remove a stored connection" },
	args: {
		domain: {
			type: "positional",
			description: "Store domain to remove",
			required: true,
		},
	},
	async run({ args }) {
		const { loadConfig, _resetConfig } = await import("../../../core/config/loader.js");
		const { createLogger } = await import("../../../core/observability/logger.js");
		const { createStorage } = await import("../../../core/storage/factory.js");

		_resetConfig();

		try {
			const config = await loadConfig();
			const logger = createLogger("cli", config.observability.log_level);
			const storage = await createStorage(config.storage, logger);
			await storage.initialize();

			const store = await storage.getStore(args.domain);
			if (!store) {
				consola.warn(`Store "${args.domain}" not found.`);
				await storage.close();
				process.exitCode = 1;
				return;
			}

			await storage.removeStore(args.domain);
			await storage.removeToken(args.domain);
			consola.success(`Removed store: ${args.domain}`);

			await storage.close();
		} catch (err) {
			consola.error("Failed to remove store:", err instanceof Error ? err.message : String(err));
			process.exitCode = 1;
		}
	},
});
