import fs from "node:fs/promises";
import path from "node:path";
import type pino from "pino";
import { decrypt, deriveKey, encrypt } from "./encryption.js";
import type { StorageBackend } from "./storage.interface.js";
import type { StoreEntry, TokenMetadata } from "./types.js";

// Type for the better-sqlite3 Database instance
type Database = import("better-sqlite3").Database;

/**
 * SQLite storage backend with AES-256-GCM token encryption.
 * Uses better-sqlite3 (synchronous API) under the hood.
 * Tokens are encrypted at rest; store data and config are stored as JSON.
 */
export class SqliteStorage implements StorageBackend {
	private readonly storagePath: string;
	private readonly dbPath: string;
	private readonly encryptionKey: Buffer;
	private readonly logger?: pino.Logger;
	private db: Database | null = null;

	constructor(storagePath: string, encryptionKey?: Buffer, logger?: pino.Logger) {
		this.storagePath = storagePath;
		this.dbPath = path.join(storagePath, "store.db");
		this.encryptionKey = encryptionKey ?? deriveKey();
		this.logger = logger;
	}

	async initialize(): Promise<void> {
		await fs.mkdir(this.storagePath, { recursive: true });

		// biome-ignore lint/suspicious/noExplicitAny: dynamic import of optional native module
		let mod: any;
		try {
			mod = await import("better-sqlite3");
		} catch {
			throw new Error(
				"better-sqlite3 is required for the SQLite storage backend but is not installed. " +
					"Install it with: pnpm add better-sqlite3\n" +
					'Or switch to the JSON backend: storage.backend = "json"',
			);
		}

		const DatabaseCtor = mod.default ?? mod;
		this.db = new DatabaseCtor(this.dbPath) as Database;

		// Enable WAL mode for better concurrent access
		this.db.pragma("journal_mode = WAL");

		// Create tables
		this.db.exec(`
			CREATE TABLE IF NOT EXISTS tokens (
				domain TEXT PRIMARY KEY,
				encrypted_token TEXT NOT NULL,
				iv TEXT NOT NULL,
				created_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS stores (
				domain TEXT PRIMARY KEY,
				data_json TEXT NOT NULL,
				created_at TEXT NOT NULL,
				updated_at TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS config (
				key TEXT PRIMARY KEY,
				value_json TEXT NOT NULL
			);
		`);

		if (this.logger) {
			this.logger.info("SQLite storage initialized with encrypted tokens");
		}
	}

	async close(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}

	// Token operations

	async getToken(storeDomain: string): Promise<string | null> {
		const db = this.getDb();
		const row = db.prepare("SELECT encrypted_token, iv FROM tokens WHERE domain = ?").get(storeDomain) as
			| { encrypted_token: string; iv: string }
			| undefined;

		if (!row) return null;
		return decrypt(row.encrypted_token, row.iv, this.encryptionKey);
	}

	async setToken(storeDomain: string, token: string, _metadata?: TokenMetadata): Promise<void> {
		const db = this.getDb();
		const { ciphertext, iv } = encrypt(token, this.encryptionKey);
		db.prepare("INSERT OR REPLACE INTO tokens (domain, encrypted_token, iv, created_at) VALUES (?, ?, ?, ?)").run(
			storeDomain,
			ciphertext,
			iv,
			new Date().toISOString(),
		);
	}

	async removeToken(storeDomain: string): Promise<void> {
		const db = this.getDb();
		db.prepare("DELETE FROM tokens WHERE domain = ?").run(storeDomain);
	}

	// Store operations

	async listStores(): Promise<StoreEntry[]> {
		const db = this.getDb();
		const rows = db.prepare("SELECT data_json FROM stores").all() as {
			data_json: string;
		}[];
		return rows.map((row) => JSON.parse(row.data_json) as StoreEntry);
	}

	async getStore(storeDomain: string): Promise<StoreEntry | null> {
		const db = this.getDb();
		const row = db.prepare("SELECT data_json FROM stores WHERE domain = ?").get(storeDomain) as
			| { data_json: string }
			| undefined;

		if (!row) return null;
		return JSON.parse(row.data_json) as StoreEntry;
	}

	async setStore(storeDomain: string, entry: StoreEntry): Promise<void> {
		const db = this.getDb();
		const now = new Date().toISOString();
		db.prepare("INSERT OR REPLACE INTO stores (domain, data_json, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
			storeDomain,
			JSON.stringify(entry),
			now,
			now,
		);
	}

	async removeStore(storeDomain: string): Promise<void> {
		const db = this.getDb();
		db.prepare("DELETE FROM stores WHERE domain = ?").run(storeDomain);
	}

	// Config persistence

	async getPersistedConfig(): Promise<Record<string, unknown> | null> {
		const db = this.getDb();
		const row = db.prepare("SELECT value_json FROM config WHERE key = ?").get("app_config") as
			| { value_json: string }
			| undefined;

		if (!row) return null;
		return JSON.parse(row.value_json) as Record<string, unknown>;
	}

	async setPersistedConfig(config: Record<string, unknown>): Promise<void> {
		const db = this.getDb();
		db.prepare("INSERT OR REPLACE INTO config (key, value_json) VALUES (?, ?)").run(
			"app_config",
			JSON.stringify(config),
		);
	}

	/**
	 * Returns the raw database instance for testing purposes.
	 * @internal
	 */
	getRawDb(): Database | null {
		return this.db;
	}

	private getDb(): Database {
		if (!this.db) {
			throw new Error("SQLite storage not initialized. Call initialize() first.");
		}
		return this.db;
	}
}
