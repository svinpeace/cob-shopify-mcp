import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { StoreEntry, TokenMetadata } from "../storage/types.js";
import { ClientCredentialsProvider } from "./client-credentials.js";

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

describe("ClientCredentialsProvider", () => {
	let storage: StorageBackend;
	let logger: import("pino").Logger;
	let originalFetch: typeof globalThis.fetch;

	beforeEach(() => {
		storage = createMockStorage();
		logger = createMockLogger();
		originalFetch = globalThis.fetch;
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it("exchanges client_id + secret for access token", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ access_token: "shpca_new_token_123" }),
		});

		const provider = new ClientCredentialsProvider("client_id_123", "client_secret_456", storage, logger);

		const token = await provider.getToken("mystore.myshopify.com");
		expect(token).toBe("shpca_new_token_123");

		const expectedBody = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: "client_id_123",
			client_secret: "client_secret_456",
		}).toString();

		expect(globalThis.fetch).toHaveBeenCalledWith(
			"https://mystore.myshopify.com/admin/oauth/access_token",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: expectedBody,
			}),
		);
	});

	it("stores token via storage backend", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ access_token: "shpca_stored_token" }),
		});

		const provider = new ClientCredentialsProvider("client_id", "client_secret", storage, logger);

		await provider.getToken("mystore.myshopify.com");

		expect(storage.setToken).toHaveBeenCalledWith(
			"mystore.myshopify.com",
			"shpca_stored_token",
			expect.objectContaining({
				authMethod: "client-credentials",
				createdAt: expect.any(String),
				expiresAt: expect.any(String),
			}),
		);
	});

	it("getToken returns cached token when not expired", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ access_token: "shpca_cached_token" }),
		});

		const provider = new ClientCredentialsProvider("client_id", "client_secret", storage, logger);

		// First call — triggers fetch
		const token1 = await provider.getToken("mystore.myshopify.com");
		// Second call — should use cache
		const token2 = await provider.getToken("mystore.myshopify.com");

		expect(token1).toBe("shpca_cached_token");
		expect(token2).toBe("shpca_cached_token");
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it("getToken refreshes when token near expiry", async () => {
		let callCount = 0;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			callCount++;
			return {
				ok: true,
				json: async () => ({ access_token: `shpca_token_${callCount}` }),
			};
		});

		const provider = new ClientCredentialsProvider("client_id", "client_secret", storage, logger);

		// First call
		const token1 = await provider.getToken("mystore.myshopify.com");
		expect(token1).toBe("shpca_token_1");

		// Simulate near-expiry by manipulating the internal expiresAt
		// Access private field via any cast
		(provider as unknown as { expiresAt: Date }).expiresAt = new Date(
			Date.now() + 30 * 1000, // 30 seconds from now (within 60s buffer)
		);

		// Second call — should trigger refresh
		const token2 = await provider.getToken("mystore.myshopify.com");
		expect(token2).toBe("shpca_token_2");
		expect(globalThis.fetch).toHaveBeenCalledTimes(2);
	});

	it("concurrent getToken calls during refresh only trigger one refresh", async () => {
		let callCount = 0;
		globalThis.fetch = vi.fn().mockImplementation(async () => {
			callCount++;
			// Simulate slow network
			await new Promise((r) => setTimeout(r, 50));
			return {
				ok: true,
				json: async () => ({ access_token: `shpca_concurrent_${callCount}` }),
			};
		});

		const provider = new ClientCredentialsProvider("client_id", "client_secret", storage, logger);

		// Fire 3 concurrent calls
		const [t1, t2, t3] = await Promise.all([
			provider.getToken("mystore.myshopify.com"),
			provider.getToken("mystore.myshopify.com"),
			provider.getToken("mystore.myshopify.com"),
		]);

		// All should get the same token — only one fetch happened
		expect(t1).toBe("shpca_concurrent_1");
		expect(t2).toBe("shpca_concurrent_1");
		expect(t3).toBe("shpca_concurrent_1");
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it("handles token exchange HTTP error with clear message", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			text: async () => "Unauthorized: invalid credentials",
		});

		const provider = new ClientCredentialsProvider("bad_client_id", "bad_client_secret", storage, logger);

		await expect(provider.getToken("mystore.myshopify.com")).rejects.toThrow(
			"Client credentials token exchange failed: HTTP 401",
		);
	});
});
