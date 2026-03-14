import type { PromptDefinition } from "@core/engine/prompt-types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerPrompts } from "./register-prompts.js";

function createMockServer() {
	return {
		tool: vi.fn(),
		resource: vi.fn(),
		prompt: vi.fn(),
	};
}

describe("registerPrompts", () => {
	let mockServer: ReturnType<typeof createMockServer>;

	beforeEach(() => {
		mockServer = createMockServer();
	});

	it("registers all prompts with McpServer.prompt()", () => {
		const prompts: PromptDefinition[] = [
			{
				name: "store-health-check",
				description: "Store health analysis",
				arguments: [{ name: "domain", description: "Store domain", required: true }],
				handler: vi.fn().mockResolvedValue([{ role: "user", content: { type: "text", text: "Check health" } }]),
			},
			{
				name: "daily-sales-report",
				description: "Daily sales report",
				arguments: [
					{ name: "date", description: "Report date", required: true },
					{ name: "domain", description: "Store domain", required: true },
				],
				handler: vi.fn().mockResolvedValue([{ role: "user", content: { type: "text", text: "Sales report" } }]),
			},
		];

		registerPrompts(mockServer as any, prompts);

		expect(mockServer.prompt).toHaveBeenCalledTimes(2);
		expect(mockServer.prompt.mock.calls[0][0]).toBe("store-health-check");
		expect(mockServer.prompt.mock.calls[1][0]).toBe("daily-sales-report");
	});

	it("prompt handler delegates to prompt definition handler", async () => {
		const handlerFn = vi.fn().mockResolvedValue([{ role: "user", content: { type: "text", text: "Analyze store" } }]);

		const prompts: PromptDefinition[] = [
			{
				name: "store-health-check",
				description: "Store health analysis",
				arguments: [{ name: "domain", description: "Store domain", required: true }],
				handler: handlerFn,
			},
		];

		registerPrompts(mockServer as any, prompts);

		// Extract the callback (4th argument: name, description, argsSchema, callback)
		const callback = mockServer.prompt.mock.calls[0][3];
		const result = await callback({ domain: "test.myshopify.com" });

		expect(handlerFn).toHaveBeenCalledWith({ domain: "test.myshopify.com" }, undefined);
		expect(result.messages).toHaveLength(1);
		expect(result.messages[0].role).toBe("user");
	});
});
