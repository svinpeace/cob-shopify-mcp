import { describe, expect, it } from "vitest";
import { configSchema } from "./schema.js";

describe("configSchema", () => {
	it("validates minimal config (just store_domain + access_token)", () => {
		const result = configSchema.parse({
			auth: {
				store_domain: "my-store.myshopify.com",
				access_token: "shpat_xxx",
			},
		});
		expect(result.auth.store_domain).toBe("my-store.myshopify.com");
		expect(result.auth.access_token).toBe("shpat_xxx");
	});

	it("applies defaults for all optional fields", () => {
		const result = configSchema.parse({});
		expect(result.auth.method).toBe("token");
		expect(result.auth.store_domain).toBe("");
		expect(result.shopify.api_version).toBe("2026-01");
		expect(result.shopify.max_retries).toBe(3);
		expect(result.shopify.cache.read_ttl).toBe(30);
		expect(result.shopify.cache.search_ttl).toBe(10);
		expect(result.shopify.cache.analytics_ttl).toBe(300);
		expect(result.tools.read_only).toBe(false);
		expect(result.tools.disable).toEqual([]);
		expect(result.tools.enable).toEqual([]);
		expect(result.tools.custom_paths).toEqual([]);
		expect(result.transport.type).toBe("stdio");
		expect(result.transport.port).toBe(3000);
		expect(result.transport.host).toBe("0.0.0.0");
		expect(result.storage.backend).toBe("json");
		expect(result.storage.path).toBe("~/.cob-shopify-mcp/");
		expect(result.storage.encrypt_tokens).toBe(false);
		expect(result.observability.log_level).toBe("info");
		expect(result.observability.audit_log).toBe(true);
		expect(result.observability.metrics).toBe(false);
		expect(result.rate_limit.respect_shopify_cost).toBe(true);
		expect(result.rate_limit.max_concurrent).toBe(10);
	});

	it("rejects unknown auth.method values", () => {
		expect(() =>
			configSchema.parse({
				auth: { method: "invalid-method" },
			}),
		).toThrow();
	});

	it("rejects negative rate_limit.max_concurrent", () => {
		expect(() =>
			configSchema.parse({
				rate_limit: { max_concurrent: -1 },
			}),
		).toThrow();
	});

	it("rejects invalid log_level values", () => {
		expect(() =>
			configSchema.parse({
				observability: { log_level: "verbose" },
			}),
		).toThrow();
	});

	it("validates tools.disable as string array", () => {
		const result = configSchema.parse({
			tools: { disable: ["list_products", "get_product"] },
		});
		expect(result.tools.disable).toEqual(["list_products", "get_product"]);
	});

	it("validates tools.enable as string array", () => {
		const result = configSchema.parse({
			tools: { enable: ["create_product"] },
		});
		expect(result.tools.enable).toEqual(["create_product"]);
	});

	it("validates tools.custom_paths as string array", () => {
		const result = configSchema.parse({
			tools: { custom_paths: ["./my-tools/", "/opt/tools/"] },
		});
		expect(result.tools.custom_paths).toEqual(["./my-tools/", "/opt/tools/"]);
	});
});
