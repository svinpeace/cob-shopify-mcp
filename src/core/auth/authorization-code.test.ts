import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { StoreEntry, TokenMetadata } from "../storage/types.js";
import { AuthorizationCodeProvider } from "./authorization-code.js";

function createMockStorage(): StorageBackend {
	const tokens = new Map<string, string>();
	return {
		getToken: vi.fn(async (domain: string) => tokens.get(domain) ?? null),
		setToken: vi.fn(async (domain: string, token: string, _metadata?: TokenMetadata) => {
			tokens.set(domain, token);
		}),
		removeToken: vi.fn(async (_domain: string) => {}),
		listStores: vi.fn(async () => []),
		getStore: vi.fn(async (_domain: string) => null),
		setStore: vi.fn(async (_domain: string, _entry: StoreEntry) => {}),
		removeStore: vi.fn(async (_domain: string) => {}),
		getPersistedConfig: vi.fn(async () => null),
		setPersistedConfig: vi.fn(async (_config: Record<string, unknown>) => {}),
		initialize: vi.fn(async () => {}),
		close: vi.fn(async () => {}),
	};
}

function createMockLogger() {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		child: vi.fn().mockReturnThis(),
	} as unknown as import("pino").Logger;
}

describe("AuthorizationCodeProvider", () => {
	let storage: StorageBackend;
	let logger: import("pino").Logger;

	beforeEach(() => {
		storage = createMockStorage();
		logger = createMockLogger();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("getToken returns stored token from storage", async () => {
		// Pre-populate storage
		await storage.setToken("mystore.myshopify.com", "shpat_stored_token_123");

		const provider = new AuthorizationCodeProvider("client_id", "client_secret", storage, logger);

		const token = await provider.getToken("mystore.myshopify.com");
		expect(token).toBe("shpat_stored_token_123");
	});

	it("getToken throws helpful error when no token stored", async () => {
		const provider = new AuthorizationCodeProvider("client_id", "client_secret", storage, logger);

		await expect(provider.getToken("mystore.myshopify.com")).rejects.toThrow(
			"No token found for mystore.myshopify.com",
		);
		await expect(provider.getToken("mystore.myshopify.com")).rejects.toThrow("cob-shopify-mcp connect");
	});

	it("authorize generates correct Shopify install URL with scopes and redirect_uri", () => {
		const provider = new AuthorizationCodeProvider(
			"my_client_id",
			"my_client_secret",
			storage,
			logger,
			["read_products", "write_products"],
			9999,
		);

		const url = provider.getInstallUrl("mystore.myshopify.com");
		expect(url).toContain("https://mystore.myshopify.com/admin/oauth/authorize");
		expect(url).toContain("client_id=my_client_id");
		expect(url).toContain("scope=read_products,write_products");
		expect(url).toContain(encodeURIComponent("http://localhost:9999/callback"));
	});

	it("validate returns true when token exists in storage", async () => {
		await storage.setToken("mystore.myshopify.com", "shpat_existing_token");

		const provider = new AuthorizationCodeProvider("client_id", "client_secret", storage, logger);

		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(true);
	});

	it("validate returns false when no token in storage", async () => {
		const provider = new AuthorizationCodeProvider("client_id", "client_secret", storage, logger);

		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(false);
	});
});
