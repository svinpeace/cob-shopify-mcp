import { createHash } from "node:crypto";

interface CacheEntry {
	value: unknown;
	expiresAt: number;
}

export class QueryCache {
	private cache = new Map<string, CacheEntry>();

	static createKey(query: string, variables: Record<string, unknown> | undefined, storeDomain: string): string {
		return createHash("sha256")
			.update(query + JSON.stringify(variables ?? {}) + storeDomain)
			.digest("hex");
	}

	get(key: string): unknown | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: string, value: unknown, ttlSeconds: number): void {
		this.cache.set(key, {
			value,
			expiresAt: Date.now() + ttlSeconds * 1000,
		});
	}

	invalidate(pattern?: string): void {
		if (!pattern) {
			this.cache.clear();
			return;
		}
		for (const key of this.cache.keys()) {
			if (key.includes(pattern)) this.cache.delete(key);
		}
	}
}
