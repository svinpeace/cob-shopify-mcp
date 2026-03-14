import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deriveKey } from "./encryption.js";
import { SqliteStorage } from "./sqlite-storage.js";
import type { StoreEntry } from "./types.js";

// Check if better-sqlite3 is available AND its native bindings work
let hasBetterSqlite3 = false;
try {
	const mod = await import("better-sqlite3");
	const Database = "default" in mod ? mod.default : mod;
	// Actually try to create a database to verify native bindings work
	const testDb = new (Database as unknown as new (path: string) => unknown)(":memory:");
	(testDb as { close: () => void }).close();
	hasBetterSqlite3 = true;
} catch {
	// Not available or native bindings not built — tests will be skipped
}

describe.skipIf(!hasBetterSqlite3)("SqliteStorage", () => {
	let tmpDir: string;
	let storage: SqliteStorage;
	const encryptionKey = deriveKey("test-key");

	beforeEach(async () => {
		tmpDir = path.join(os.tmpdir(), `cob-sqlite-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		storage = new SqliteStorage(tmpDir, encryptionKey);
	});

	afterEach(async () => {
		await storage.close();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("initialize creates store.db", async () => {
		await storage.initialize();
		const dbPath = path.join(tmpDir, "store.db");
		const stat = await fs.stat(dbPath);
		expect(stat.isFile()).toBe(true);
	});

	it("setToken encrypts and stores", async () => {
		await storage.initialize();
		await storage.setToken("test.myshopify.com", "shpat_secret_token");
		// Verify the token can be retrieved (decrypted)
		const token = await storage.getToken("test.myshopify.com");
		expect(token).toBe("shpat_secret_token");
	});

	it("getToken decrypts and returns", async () => {
		await storage.initialize();
		await storage.setToken("test.myshopify.com", "shpat_my_token_value");
		const token = await storage.getToken("test.myshopify.com");
		expect(token).toBe("shpat_my_token_value");
	});

	it("getToken returns null for unknown domain", async () => {
		await storage.initialize();
		const token = await storage.getToken("unknown.myshopify.com");
		expect(token).toBeNull();
	});

	it("stored token in DB is not plaintext", async () => {
		await storage.initialize();
		const plaintextToken = "shpat_plaintext_check_12345";
		await storage.setToken("test.myshopify.com", plaintextToken);

		// Read raw from DB to verify encryption
		const db = storage.getRawDb();
		expect(db).not.toBeNull();
		const row = db?.prepare("SELECT encrypted_token FROM tokens WHERE domain = ?").get("test.myshopify.com") as {
			encrypted_token: string;
		};

		expect(row.encrypted_token).not.toBe(plaintextToken);
		expect(row.encrypted_token).not.toContain(plaintextToken);
	});

	it("removeToken deletes from DB", async () => {
		await storage.initialize();
		await storage.setToken("test.myshopify.com", "shpat_to_delete");
		await storage.removeToken("test.myshopify.com");
		const token = await storage.getToken("test.myshopify.com");
		expect(token).toBeNull();
	});

	it("listStores returns all stores", async () => {
		await storage.initialize();
		const entry1: StoreEntry = {
			domain: "store1.myshopify.com",
			scopes: ["read_products"],
			installedAt: "2026-01-01T00:00:00Z",
			status: "active",
		};
		const entry2: StoreEntry = {
			domain: "store2.myshopify.com",
			scopes: ["read_orders"],
			installedAt: "2026-02-01T00:00:00Z",
			status: "inactive",
		};
		await storage.setStore("store1.myshopify.com", entry1);
		await storage.setStore("store2.myshopify.com", entry2);

		const stores = await storage.listStores();
		expect(stores).toHaveLength(2);
		expect(stores).toEqual(expect.arrayContaining([entry1, entry2]));
	});

	it("setStore + getStore roundtrip", async () => {
		await storage.initialize();
		const entry: StoreEntry = {
			domain: "test.myshopify.com",
			scopes: ["read_products", "write_products"],
			installedAt: "2026-03-01T00:00:00Z",
			status: "active",
			ownerEmail: "owner@example.com",
		};
		await storage.setStore("test.myshopify.com", entry);
		const result = await storage.getStore("test.myshopify.com");
		expect(result).toEqual(entry);
	});

	it("getStore returns null for unknown domain", async () => {
		await storage.initialize();
		const result = await storage.getStore("unknown.myshopify.com");
		expect(result).toBeNull();
	});

	it("removeStore deletes from DB", async () => {
		await storage.initialize();
		const entry: StoreEntry = {
			domain: "test.myshopify.com",
			scopes: ["read_products"],
			installedAt: "2026-01-01T00:00:00Z",
			status: "active",
		};
		await storage.setStore("test.myshopify.com", entry);
		await storage.removeStore("test.myshopify.com");
		const result = await storage.getStore("test.myshopify.com");
		expect(result).toBeNull();
	});

	it("setPersistedConfig + getPersistedConfig roundtrip", async () => {
		await storage.initialize();
		const config = { theme: "dark", retries: 3 };
		await storage.setPersistedConfig(config);
		const result = await storage.getPersistedConfig();
		expect(result).toEqual(config);
	});

	it("getPersistedConfig returns null when empty", async () => {
		await storage.initialize();
		const config = await storage.getPersistedConfig();
		expect(config).toBeNull();
	});
});
