import type { ShopifyCostData } from "@core/observability/types.js";
import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limiter.js";

function makeCostData(overrides: Partial<ShopifyCostData> = {}): ShopifyCostData {
	return {
		requestedQueryCost: 100,
		actualQueryCost: 50,
		throttleStatus: {
			maximumAvailable: 1000,
			currentlyAvailable: 950,
			restoreRate: 50,
		},
		...overrides,
	};
}

describe("RateLimiter", () => {
	it("acquire resolves immediately when bucket has capacity", async () => {
		const limiter = new RateLimiter();
		await expect(limiter.acquire(10)).resolves.toBeUndefined();
	});

	it("acquire blocks when bucket is near zero", async () => {
		const limiter = new RateLimiter({ maxConcurrent: 100 });
		// Drain the bucket
		limiter.updateFromResponse(
			makeCostData({
				throttleStatus: {
					maximumAvailable: 1000,
					currentlyAvailable: 5,
					restoreRate: 50,
				},
			}),
		);

		// This should block because estimated cost (100) > available (5)
		let resolved = false;
		const promise = limiter.acquire(100).then(() => {
			resolved = true;
		});

		// Give microtasks a chance to run
		await new Promise((r) => setTimeout(r, 10));
		expect(resolved).toBe(false);

		// Refill the bucket
		limiter.updateFromResponse(
			makeCostData({
				throttleStatus: {
					maximumAvailable: 1000,
					currentlyAvailable: 500,
					restoreRate: 50,
				},
			}),
		);

		// Release a slot to trigger queue processing
		// We need to first have someone release, but nobody acquired yet
		// The queue processing happens on release, so let's acquire+release one to trigger it
		await limiter.acquire(0);
		limiter.release();

		await promise;
		expect(resolved).toBe(true);
	});

	it("updateFromResponse updates bucket from throttleStatus", () => {
		const limiter = new RateLimiter();
		limiter.updateFromResponse(
			makeCostData({
				throttleStatus: {
					maximumAvailable: 2000,
					currentlyAvailable: 1500,
					restoreRate: 100,
				},
			}),
		);
		expect(limiter._currentlyAvailable).toBe(1500);
	});

	it("maxConcurrent limits parallel queries", async () => {
		const limiter = new RateLimiter({ maxConcurrent: 2 });

		// Acquire 2 slots
		await limiter.acquire();
		await limiter.acquire();

		// 3rd should block
		let thirdResolved = false;
		const thirdPromise = limiter.acquire().then(() => {
			thirdResolved = true;
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(thirdResolved).toBe(false);

		// Release one
		limiter.release();
		await thirdPromise;
		expect(thirdResolved).toBe(true);
	});

	it("disabled when respectShopifyCost is false", async () => {
		const limiter = new RateLimiter({
			respectShopifyCost: false,
			maxConcurrent: 1,
		});

		// Should not block even though maxConcurrent is 1
		await expect(limiter.acquire(10)).resolves.toBeUndefined();
		await expect(limiter.acquire(10)).resolves.toBeUndefined();
		await expect(limiter.acquire(10)).resolves.toBeUndefined();
	});
});
