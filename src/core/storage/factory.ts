import os from "node:os";
import path from "node:path";
import type pino from "pino";
import type { StorageBackend } from "./storage.interface.js";

/**
 * Expands ~ to the user's home directory.
 */
function expandPath(p: string): string {
	if (p.startsWith("~/") || p === "~") {
		return path.join(os.homedir(), p.slice(1));
	}
	return p;
}

/**
 * Creates a storage backend based on the provided config.
 * Defaults to JSON if no backend is specified.
 */
export async function createStorage(
	config: {
		backend: string;
		path: string;
		encrypt_tokens?: boolean;
	},
	logger?: pino.Logger,
): Promise<StorageBackend> {
	const expandedPath = expandPath(config.path);

	if (config.backend === "sqlite") {
		let SqliteStorageModule: typeof import("./sqlite-storage.js");
		try {
			SqliteStorageModule = await import("./sqlite-storage.js");
		} catch {
			throw new Error(
				"Failed to load SQLite storage module. " +
					"Ensure better-sqlite3 is installed: pnpm add better-sqlite3\n" +
					'Or switch to the JSON backend: storage.backend = "json"',
			);
		}
		return new SqliteStorageModule.SqliteStorage(expandedPath, undefined, logger);
	}

	// Default: JSON backend
	const { JsonStorage } = await import("./json-storage.js");
	return new JsonStorage(expandedPath, logger);
}
