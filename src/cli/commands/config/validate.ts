import { defineCommand } from "citty";
import { consola } from "consola";

export default defineCommand({
	meta: { name: "validate", description: "Validate configuration" },
	async run() {
		const { loadConfig, _resetConfig } = await import("../../../core/config/loader.js");
		_resetConfig();

		try {
			await loadConfig();
			consola.success("Configuration is valid.");
		} catch (err) {
			consola.error("Configuration validation failed:", err instanceof Error ? err.message : String(err));
			process.exitCode = 1;
		}
	},
});
