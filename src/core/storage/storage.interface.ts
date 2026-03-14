import type { StoreEntry, TokenMetadata } from "./types.js";

export interface StorageBackend {
	// Token operations
	getToken(storeDomain: string): Promise<string | null>;
	setToken(storeDomain: string, token: string, metadata?: TokenMetadata): Promise<void>;
	removeToken(storeDomain: string): Promise<void>;

	// Store operations
	listStores(): Promise<StoreEntry[]>;
	getStore(storeDomain: string): Promise<StoreEntry | null>;
	setStore(storeDomain: string, entry: StoreEntry): Promise<void>;
	removeStore(storeDomain: string): Promise<void>;

	// Config persistence
	getPersistedConfig(): Promise<Record<string, unknown> | null>;
	setPersistedConfig(config: Record<string, unknown>): Promise<void>;

	// Lifecycle
	initialize(): Promise<void>;
	close(): Promise<void>;
}
