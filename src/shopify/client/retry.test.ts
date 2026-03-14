import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
	it("succeeds on first try — no retry", async () => {
		const fn = vi.fn().mockResolvedValue("ok");
		const result = await withRetry(fn, { baseDelayMs: 1 });
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("retries on 429 and succeeds on second try", async () => {
		const error = Object.assign(new Error("throttled"), { status: 429 });
		const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

		const result = await withRetry(fn, { baseDelayMs: 1 });
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("retries on 500 with exponential backoff", async () => {
		const error = Object.assign(new Error("server error"), { status: 500 });
		const fn = vi.fn().mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValue("ok");

		const result = await withRetry(fn, { baseDelayMs: 1 });
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("respects Retry-After header", async () => {
		const headers = { get: vi.fn().mockReturnValue("1") };
		const error = Object.assign(new Error("throttled"), {
			status: 429,
			response: { status: 429, headers },
		});
		const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue("ok");

		const start = Date.now();
		await withRetry(fn, { baseDelayMs: 1 });
		const elapsed = Date.now() - start;

		expect(headers.get).toHaveBeenCalledWith("Retry-After");
		// Should have waited ~1000ms (Retry-After: 1 second)
		expect(elapsed).toBeGreaterThanOrEqual(900);
	});

	it("does not retry on 400 (client error)", async () => {
		const error = Object.assign(new Error("bad request"), { status: 400 });
		const fn = vi.fn().mockRejectedValue(error);

		await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow("bad request");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("stops after maxRetries and throws", async () => {
		const error = Object.assign(new Error("server error"), { status: 500 });
		const fn = vi.fn().mockRejectedValue(error);

		await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow("server error");
		expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
	});
});
