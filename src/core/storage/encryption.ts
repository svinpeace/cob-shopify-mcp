import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import os from "node:os";

/**
 * Derives a 32-byte AES-256 key from a seed string.
 * If no seed is provided, uses hostname + username as a machine-specific default.
 */
export function deriveKey(seed?: string): Buffer {
	const actualSeed = seed || `${os.hostname()}:${os.userInfo().username}`;
	return scryptSync(actualSeed, "cob-shopify-mcp-salt", 32);
}

/**
 * Encrypts plaintext using AES-256-GCM with a random IV.
 * Returns the ciphertext (hex) with appended auth tag, and the IV (hex).
 */
export function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string } {
	const iv = randomBytes(16);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	let encrypted = cipher.update(plaintext, "utf8", "hex");
	encrypted += cipher.final("hex");
	const authTag = cipher.getAuthTag();
	return {
		ciphertext: `${encrypted}:${authTag.toString("hex")}`,
		iv: iv.toString("hex"),
	};
}

/**
 * Decrypts ciphertext produced by encrypt() using AES-256-GCM.
 */
export function decrypt(ciphertext: string, iv: string, key: Buffer): string {
	const [encrypted, authTagHex] = ciphertext.split(":");
	const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "hex"));
	decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
	let decrypted = decipher.update(encrypted, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}
