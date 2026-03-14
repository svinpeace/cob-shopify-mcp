import { describe, expect, it } from "vitest";
import type { ResourceDefinition } from "../engine/resource-types.js";
import { defineResource } from "./define-resource.js";

function validDef(): ResourceDefinition {
	return {
		uri: "shopify://shop/{domain}/info",
		name: "Shop Info",
		description: "Basic shop information",
		mimeType: "application/json",
		handler: async (params) => ({
			uri: `shopify://shop/${params.domain}/info`,
			mimeType: "application/json",
			text: "{}",
		}),
	};
}

describe("defineResource", () => {
	it("returns frozen ResourceDefinition for valid input", () => {
		const result = defineResource(validDef());
		expect(Object.isFrozen(result)).toBe(true);
	});

	it("throws when handler is missing", () => {
		const def = validDef();
		// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
		(def as any).handler = undefined;
		expect(() => defineResource(def)).toThrow("Resource must have a handler");
	});

	it("throws when uri is missing", () => {
		const def = validDef();
		def.uri = "";
		expect(() => defineResource(def)).toThrow("Resource must have a URI");
	});

	it("preserves all fields", () => {
		const def = validDef();
		const result = defineResource(def);
		expect(result.uri).toBe(def.uri);
		expect(result.name).toBe(def.name);
		expect(result.description).toBe(def.description);
		expect(result.mimeType).toBe(def.mimeType);
		expect(result.handler).toBe(def.handler);
	});
});
