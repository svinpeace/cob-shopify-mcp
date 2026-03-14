import { describe, expect, it } from "vitest";
import type { PromptDefinition } from "../engine/prompt-types.js";
import { definePrompt } from "./define-prompt.js";

function validDef(): PromptDefinition {
	return {
		name: "analyze_product",
		description: "Analyze a product listing",
		arguments: [
			{ name: "product_id", description: "Product GID", required: true },
			{ name: "focus", description: "Analysis focus", required: false },
		],
		handler: async (args) => [
			{
				role: "user" as const,
				content: { type: "text" as const, text: `Analyze ${args.product_id}` },
			},
		],
	};
}

describe("definePrompt", () => {
	it("returns frozen PromptDefinition for valid input", () => {
		const result = definePrompt(validDef());
		expect(Object.isFrozen(result)).toBe(true);
	});

	it("throws when handler is missing", () => {
		const def = validDef();
		// biome-ignore lint/suspicious/noExplicitAny: testing invalid input
		(def as any).handler = undefined;
		expect(() => definePrompt(def)).toThrow("Prompt must have a handler");
	});

	it("throws when name is missing", () => {
		const def = validDef();
		def.name = "";
		expect(() => definePrompt(def)).toThrow("Prompt must have a name");
	});

	it("preserves arguments array", () => {
		const def = validDef();
		const result = definePrompt(def);
		expect(result.arguments).toEqual(def.arguments);
		expect(result.arguments).not.toBe(def.arguments);
	});
});
