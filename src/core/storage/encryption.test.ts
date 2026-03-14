import { describe, expect, it } from "vitest";
import { decrypt, deriveKey, encrypt } from "./encryption.js";

describe("encryption", () => {
	const key = deriveKey("test-seed");

	it("encrypt returns ciphertext and iv", () => {
		const result = encrypt("hello world", key);
		expect(result.ciphertext).toBeDefined();
		expect(result.iv).toBeDefined();
		expect(typeof result.ciphertext).toBe("string");
		expect(typeof result.iv).toBe("string");
		expect(result.ciphertext.length).toBeGreaterThan(0);
		expect(result.iv.length).toBeGreaterThan(0);
	});

	it("decrypt with correct key returns original plaintext", () => {
		const plaintext = "shpat_secret_token_12345";
		const { ciphertext, iv } = encrypt(plaintext, key);
		const decrypted = decrypt(ciphertext, iv, key);
		expect(decrypted).toBe(plaintext);
	});

	it("decrypt with wrong key throws error", () => {
		const { ciphertext, iv } = encrypt("secret data", key);
		const wrongKey = deriveKey("wrong-seed");
		expect(() => decrypt(ciphertext, iv, wrongKey)).toThrow();
	});

	it("different IVs produce different ciphertext for same plaintext", () => {
		const plaintext = "same-data";
		const result1 = encrypt(plaintext, key);
		const result2 = encrypt(plaintext, key);
		// IVs should differ (random)
		expect(result1.iv).not.toBe(result2.iv);
		// Ciphertext should differ due to different IVs
		expect(result1.ciphertext).not.toBe(result2.ciphertext);
	});

	it("deriveKey is deterministic with same seed", () => {
		const key1 = deriveKey("my-seed");
		const key2 = deriveKey("my-seed");
		expect(key1.equals(key2)).toBe(true);
	});

	it("deriveKey differs with different seed", () => {
		const key1 = deriveKey("seed-a");
		const key2 = deriveKey("seed-b");
		expect(key1.equals(key2)).toBe(false);
	});
});
