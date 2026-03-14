import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import pino from "pino";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonStorage } from "./json-storage.js";
import type { StoreEntry } from "./types.js";

describe("JsonStorage", () => {
	let tmpDir: string;
	let storage: JsonStorage;

	beforeEach(async () => {
		tmpDir = path.join(os.tmpdir(), `cob-json-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		storage = new JsonStorage(tmpDir);
	});

	afterEach(async () => {
		await storage.close();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it("initialize creates directory", async () => {
		await storage.initialize();
		const stat = await fs.stat(tmpDir);
		expect(stat.isDirectory()).toBe(true);
	});

	it("setToken + getToken roundtrip", async () => {
		await storage.initialize();
		await storage.setToken("test.myshopify.com", "shpat_abc123");
		const token = await storage.getToken("test.myshopify.com");
		expect(token).toBe("shpat_abc123");
	});

	it("getToken returns null for unknown domain", async () => {
		await storage.initialize();
		const token = await storage.getToken("unknown.myshopify.com");
		expect(token).toBeNull();
	});

	it("removeToken makes getToken return null", async () => {
		await storage.initialize();
		await storage.setToken("test.myshopify.com", "shpat_abc123");
		await storage.removeToken("test.myshopify.com");
		const token = await storage.getToken("test.myshopify.com");
		expect(token).toBeNull();
	});

	it("listStores returns all stored stores", async () => {
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

	it("removeStore makes getStore return null", async () => {
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

	it("getPersistedConfig returns null when empty", async () => {
		await storage.initialize();
		const config = await storage.getPersistedConfig();
		expect(config).toBeNull();
	});

	it("setPersistedConfig + getPersistedConfig roundtrip", async () => {
		await storage.initialize();
		const config = { theme: "dark", maxRetries: 5 };
		await storage.setPersistedConfig(config);
		const result = await storage.getPersistedConfig();
		expect(result).toEqual(config);
	});

	it("logs plaintext warning on initialize", async () => {
		const chunks: string[] = [];
		const dest = new Writable({
			write(chunk, _encoding, callback) {
				chunks.push(chunk.toString());
				callback();
			},
		});
		const logger = pino({ level: "warn" }, dest);
		const child = logger.child({ module: "storage" });

		const storageWithLogger = new JsonStorage(tmpDir, child);
		await storageWithLogger.initialize();
		dest.end();

		expect(chunks.length).toBeGreaterThan(0);
		const parsed = JSON.parse(chunks[0]);
		expect(parsed.msg).toContain("PLAINTEXT");
	});

	it("uses atomic writes (temp file then rename)", async () => {
		await storage.initialize();
		// After writing, the tokens.json should exist and the .tmp should not
		await storage.setToken("test.myshopify.com", "shpat_xyz");
		const tokensPath = path.join(tmpDir, "tokens.json");
		const tmpPath = `${tokensPath}.tmp`;

		const stat = await fs.stat(tokensPath);
		expect(stat.isFile()).toBe(true);

		// Temp file should not linger
		await expect(fs.access(tmpPath)).rejects.toThrow();
	});
});
