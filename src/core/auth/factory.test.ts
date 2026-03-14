import { describe, expect, it, vi } from "vitest";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { StoreEntry, TokenMetadata } from "../storage/types.js";
import { AuthorizationCodeProvider } from "./authorization-code.js";
import { ClientCredentialsProvider } from "./client-credentials.js";
import { createAuthProvider } from "./factory.js";
import { StaticTokenProvider } from "./static-token.js";

function createMockStorage(): StorageBackend {
	return {
		getToken: vi.fn(async () => null),
		setToken: vi.fn(async (_domain: string, _token: string, _metadata?: TokenMetadata) => {}),
		removeToken: vi.fn(async () => {}),
		listStores: vi.fn(async () => []),
		getStore: vi.fn(async () => null),
		setStore: vi.fn(async (_domain: string, _entry: StoreEntry) => {}),
		removeStore: vi.fn(async () => {}),
		getPersistedConfig: vi.fn(async () => null),
		setPersistedConfig: vi.fn(async () => {}),
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

describe("createAuthProvider", () => {
	it("returns StaticTokenProvider when access_token in config", () => {
		const provider = createAuthProvider(
			{
				method: "token",
				store_domain: "mystore.myshopify.com",
				access_token: "shpat_test_token_12345",
			},
			createMockStorage(),
			createMockLogger(),
		);

		expect(provider).toBeInstanceOf(StaticTokenProvider);
		expect(provider.type).toBe("static");
	});

	it("returns ClientCredentialsProvider when client_id + secret in config", () => {
		const provider = createAuthProvider(
			{
				method: "client-credentials",
				store_domain: "mystore.myshopify.com",
				client_id: "client_id_123",
				client_secret: "client_secret_456",
			},
			createMockStorage(),
			createMockLogger(),
		);

		expect(provider).toBeInstanceOf(ClientCredentialsProvider);
		expect(provider.type).toBe("client-credentials");
	});

	it("returns AuthorizationCodeProvider when method is authorization-code with client_id + secret", () => {
		const provider = createAuthProvider(
			{
				method: "authorization-code",
				store_domain: "mystore.myshopify.com",
				client_id: "client_id_123",
				client_secret: "client_secret_456",
			},
			createMockStorage(),
			createMockLogger(),
		);

		expect(provider).toBeInstanceOf(AuthorizationCodeProvider);
		expect(provider.type).toBe("authorization-code");
	});

	it("throws when no credentials provided", () => {
		expect(() =>
			createAuthProvider(
				{
					method: "token",
					store_domain: "mystore.myshopify.com",
				},
				createMockStorage(),
				createMockLogger(),
			),
		).toThrow("No authentication credentials found");
	});

	it("throws with helpful message listing what's needed", () => {
		expect(() =>
			createAuthProvider(
				{
					method: "client-credentials",
					store_domain: "mystore.myshopify.com",
				},
				createMockStorage(),
				createMockLogger(),
			),
		).toThrow("SHOPIFY_ACCESS_TOKEN");
		expect(() =>
			createAuthProvider(
				{
					method: "client-credentials",
					store_domain: "mystore.myshopify.com",
				},
				createMockStorage(),
				createMockLogger(),
			),
		).toThrow("SHOPIFY_CLIENT_ID");
	});
});
