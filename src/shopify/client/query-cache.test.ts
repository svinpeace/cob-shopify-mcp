import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryCache } from "./query-cache.js";

describe("QueryCache", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("get returns undefined for cache miss", () => {
		const cache = new QueryCache();
		expect(cache.get("nonexistent")).toBeUndefined();
	});

	it("set + get roundtrip returns cached value", () => {
		const cache = new QueryCache();
		const value = { products: [{ id: "1" }] };
		cache.set("key1", value, 30);
		expect(cache.get("key1")).toEqual(value);
	});

	it("cached value expires after TTL", () => {
		const cache = new QueryCache();
		cache.set("key1", { data: "test" }, 10);

		expect(cache.get("key1")).toBeDefined();

		// Advance past TTL
		vi.advanceTimersByTime(11_000);

		expect(cache.get("key1")).toBeUndefined();
	});

	it("different variables produce different cache keys", () => {
		const query = "{ products { id } }";
		const store = "test.myshopify.com";

		const key1 = QueryCache.createKey(query, { first: 10 }, store);
		const key2 = QueryCache.createKey(query, { first: 20 }, store);

		expect(key1).not.toBe(key2);
	});

	it("invalidate clears all entries", () => {
		const cache = new QueryCache();
		cache.set("key1", "val1", 30);
		cache.set("key2", "val2", 30);

		cache.invalidate();

		expect(cache.get("key1")).toBeUndefined();
		expect(cache.get("key2")).toBeUndefined();
	});

	it("cache key includes storeDomain", () => {
		const query = "{ products { id } }";
		const vars = { first: 10 };

		const key1 = QueryCache.createKey(query, vars, "store-a.myshopify.com");
		const key2 = QueryCache.createKey(query, vars, "store-b.myshopify.com");

		expect(key1).not.toBe(key2);
	});
});
