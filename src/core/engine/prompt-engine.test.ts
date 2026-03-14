import { describe, expect, it, vi } from "vitest";
import { PromptEngine } from "./prompt-engine.js";
import type { PromptDefinition } from "./prompt-types.js";

function makePrompt(overrides?: Partial<PromptDefinition>): PromptDefinition {
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
				content: {
					type: "text" as const,
					text: `Analyze ${args.product_id}`,
				},
			},
		],
		...overrides,
	};
}

describe("PromptEngine", () => {
	it("register + list roundtrip", () => {
		const engine = new PromptEngine();
		const prompt = makePrompt();
		engine.register(prompt);
		const list = engine.list();
		expect(list).toHaveLength(1);
		expect(list[0].name).toBe(prompt.name);
	});

	it("get calls handler with provided args", async () => {
		const engine = new PromptEngine();
		const handler = vi.fn(async () => [
			{
				role: "user" as const,
				content: { type: "text" as const, text: "test" },
			},
		]);
		engine.register(makePrompt({ handler }));

		await engine.get("analyze_product", { product_id: "gid://shopify/Product/1", focus: "seo" }, {});
		expect(handler).toHaveBeenCalledWith({ product_id: "gid://shopify/Product/1", focus: "seo" }, {});
	});

	it("get throws when required argument is missing", async () => {
		const engine = new PromptEngine();
		engine.register(makePrompt());

		await expect(engine.get("analyze_product", {}, {})).rejects.toThrow("Missing required argument: product_id");
	});

	it("get succeeds when optional argument is missing", async () => {
		const engine = new PromptEngine();
		engine.register(makePrompt());

		const result = await engine.get("analyze_product", { product_id: "gid://shopify/Product/1" }, {});
		expect(result).toHaveLength(1);
		expect(result[0].role).toBe("user");
	});

	it("get throws when prompt not found", async () => {
		const engine = new PromptEngine();

		await expect(engine.get("nonexistent", {}, {})).rejects.toThrow("Prompt not found: nonexistent");
	});
});
