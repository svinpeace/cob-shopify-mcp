import { defineCommand } from "citty";
import { consola } from "consola";
import { formatTable } from "../../utils.js";

export default defineCommand({
	meta: { name: "list", description: "List connected stores" },
	async run() {
		const { loadConfig, _resetConfig } = await import("../../../core/config/loader.js");
		const { createLogger } = await import("../../../core/observability/logger.js");
		const { createStorage } = await import("../../../core/storage/factory.js");

		_resetConfig();

		try {
			const config = await loadConfig();
			const logger = createLogger("cli", config.observability.log_level);
			const storage = await createStorage(config.storage, logger);
			await storage.initialize();

			const stores = await storage.listStores();

			if (stores.length === 0) {
				consola.info("No connected stores found.");
				await storage.close();
				return;
			}

			const rows = stores.map((s) => [s.domain, s.status, s.scopes.join(", "), s.installedAt]);

			const table = formatTable(["Domain", "Status", "Scopes", "Installed At"], rows);
			process.stderr.write(`${table}\n`);

			await storage.close();
		} catch (err) {
			consola.error("Failed to list stores:", err instanceof Error ? err.message : String(err));
			process.exitCode = 1;
		}
	},
});
