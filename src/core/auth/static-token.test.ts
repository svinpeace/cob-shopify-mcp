import { describe, expect, it } from "vitest";
import { StaticTokenProvider } from "./static-token.js";

describe("StaticTokenProvider", () => {
	it("getToken returns configured access_token", async () => {
		const provider = new StaticTokenProvider("shpat_test_token_12345");
		const token = await provider.getToken("mystore.myshopify.com");
		expect(token).toBe("shpat_test_token_12345");
	});

	it("validate returns true for valid shpat_ token", async () => {
		const provider = new StaticTokenProvider("shpat_abcdef12345");
		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(true);
	});

	it("validate returns true for valid shpca_ token", async () => {
		const provider = new StaticTokenProvider("shpca_abcdef12345");
		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(true);
	});

	it("validate returns false for empty string", async () => {
		const provider = new StaticTokenProvider("");
		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(false);
	});

	it("validate returns false for token without valid prefix", async () => {
		const provider = new StaticTokenProvider("invalid_token_12345");
		const valid = await provider.validate("mystore.myshopify.com");
		expect(valid).toBe(false);
	});
});
