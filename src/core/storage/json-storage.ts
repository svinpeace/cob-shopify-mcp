import fs from "node:fs/promises";
import path from "node:path";
import type pino from "pino";
import type { StorageBackend } from "./storage.interface.js";
import type { StoreEntry, TokenMetadata } from "./types.js";

/**
 * JSON file storage backend.
 * Stores tokens, stores, and config as individual JSON files.
 * Tokens are stored in PLAINTEXT — a warning is logged on initialize().
 */
export class JsonStorage implements StorageBackend {
	private readonly storagePath: string;
	private readonly tokensFile: string;
	private readonly storesFile: string;
	private readonly configFile: string;
	private readonly logger?: pino.Logger;

	constructor(storagePath: string, logger?: pino.Logger) {
		this.storagePath = storagePath;
		this.tokensFile = path.join(storagePath, "tokens.json");
		this.storesFile = path.join(storagePath, "stores.json");
		this.configFile = path.join(storagePath, "config.json");
		this.logger = logger;
	}

	async initialize(): Promise<void> {
		await fs.mkdir(this.storagePath, { recursive: true });

		// Ensure files exist
		await this.ensureFile(this.tokensFile, {});
		await this.ensureFile(this.storesFile, {});
		await this.ensureFile(this.configFile, {});

		if (this.logger) {
			this.logger.warn(
				"JSON storage backend stores tokens in PLAINTEXT. " +
					"For production use, switch to SQLite backend with encryption: " +
					'storage.backend = "sqlite"',
			);
		}
	}

	async close(): Promise<void> {
		// No-op for file-based storage
	}

	// Token operations

	async getToken(storeDomain: string): Promise<string | null> {
		const data = await this.readJsonFile<Record<string, string>>(this.tokensFile);
		return data[storeDomain] ?? null;
	}

	async setToken(storeDomain: string, token: string, _metadata?: TokenMetadata): Promise<void> {
		const data = await this.readJsonFile<Record<string, string>>(this.tokensFile);
		data[storeDomain] = token;
		await this.writeJsonFile(this.tokensFile, data);
	}

	async removeToken(storeDomain: string): Promise<void> {
		const data = await this.readJsonFile<Record<string, string>>(this.tokensFile);
		delete data[storeDomain];
		await this.writeJsonFile(this.tokensFile, data);
	}

	// Store operations

	async listStores(): Promise<StoreEntry[]> {
		const data = await this.readJsonFile<Record<string, StoreEntry>>(this.storesFile);
		return Object.values(data);
	}

	async getStore(storeDomain: string): Promise<StoreEntry | null> {
		const data = await this.readJsonFile<Record<string, StoreEntry>>(this.storesFile);
		return data[storeDomain] ?? null;
	}

	async setStore(storeDomain: string, entry: StoreEntry): Promise<void> {
		const data = await this.readJsonFile<Record<string, StoreEntry>>(this.storesFile);
		data[storeDomain] = entry;
		await this.writeJsonFile(this.storesFile, data);
	}

	async removeStore(storeDomain: string): Promise<void> {
		const data = await this.readJsonFile<Record<string, StoreEntry>>(this.storesFile);
		delete data[storeDomain];
		await this.writeJsonFile(this.storesFile, data);
	}

	// Config persistence

	async getPersistedConfig(): Promise<Record<string, unknown> | null> {
		const data = await this.readJsonFile<Record<string, unknown>>(this.configFile);
		return Object.keys(data).length === 0 ? null : data;
	}

	async setPersistedConfig(config: Record<string, unknown>): Promise<void> {
		await this.writeJsonFile(this.configFile, config);
	}

	// Private helpers

	private async ensureFile(filePath: string, defaultContent: unknown): Promise<void> {
		try {
			await fs.access(filePath);
		} catch {
			await this.writeJsonFile(filePath, defaultContent);
		}
	}

	private async readJsonFile<T>(filePath: string): Promise<T> {
		try {
			const content = await fs.readFile(filePath, "utf-8");
			return JSON.parse(content) as T;
		} catch {
			return {} as T;
		}
	}

	/**
	 * Atomic write: write to temp file then rename.
	 * Sets file permissions to 0o600 (owner read/write only).
	 */
	private async writeJsonFile(filePath: string, data: unknown): Promise<void> {
		const tmpPath = `${filePath}.tmp`;
		const content = JSON.stringify(data, null, 2);
		await fs.writeFile(tmpPath, content, { encoding: "utf-8", mode: 0o600 });
		await fs.rename(tmpPath, filePath);
		// On some platforms, rename doesn't preserve mode from writeFile.
		// Explicitly set permissions after rename — may be a no-op on Windows.
		try {
			await fs.chmod(filePath, 0o600);
		} catch {
			// chmod may not be fully supported on Windows; ignore gracefully
		}
	}
}
