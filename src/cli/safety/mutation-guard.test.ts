import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { ToolDefinition } from "../../core/engine/types.js";
import { confirmMutation, isMutation } from "./mutation-guard.js";

function makeTool(scopes: string[], overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		name: "update_product",
		domain: "products",
		tier: 1,
		description: "Update a product",
		scopes,
		input: {
			id: z.string().describe("Product ID"),
		},
		handler: async () => ({}),
		...overrides,
	};
}

describe("isMutation", () => {
	it("returns true for tool with write_ scopes", () => {
		expect(isMutation(makeTool(["write_products"]))).toBe(true);
	});

	it("returns true when write scope is mixed with read scopes", () => {
		expect(isMutation(makeTool(["read_products", "write_products"]))).toBe(true);
	});

	it("returns false for tool with only read_ scopes", () => {
		expect(isMutation(makeTool(["read_products"]))).toBe(false);
	});

	it("returns false for tool with empty scopes", () => {
		expect(isMutation(makeTool([]))).toBe(false);
	});

	it("returns false for non-write scopes", () => {
		expect(isMutation(makeTool(["unauthenticated_read_products"]))).toBe(false);
	});
});

describe("confirmMutation", () => {
	const originalIsTTY = process.stderr.isTTY;

	afterEach(() => {
		Object.defineProperty(process.stderr, "isTTY", { value: originalIsTTY, writable: true });
		vi.restoreAllMocks();
	});

	it("auto-confirms when --yes flag is set", async () => {
		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, { yes: true });
		expect(result).toBe(true);
	});

	it("auto-confirms when stderr is not a TTY (piped/automated)", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: undefined, writable: true });
		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(true);
	});

	it("returns true when user answers 'y'", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		// Mock consola.prompt to return "y"
		const consola = await import("consola");
		vi.spyOn(consola.consola, "prompt").mockResolvedValue("y" as never);

		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(true);
	});

	it("returns true when user answers 'yes'", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		const consola = await import("consola");
		vi.spyOn(consola.consola, "prompt").mockResolvedValue("yes" as never);

		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(true);
	});

	it("returns false when user answers 'n'", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		const consola = await import("consola");
		vi.spyOn(consola.consola, "prompt").mockResolvedValue("n" as never);

		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(false);
	});

	it("returns false when user answers empty string", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		const consola = await import("consola");
		vi.spyOn(consola.consola, "prompt").mockResolvedValue("" as never);

		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(false);
	});

	it("returns false on cancel symbol (Ctrl+C)", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		const consola = await import("consola");
		vi.spyOn(consola.consola, "prompt").mockResolvedValue(Symbol.for("cancel") as never);

		const tool = makeTool(["write_products"]);
		const result = await confirmMutation(tool, {});
		expect(result).toBe(false);
	});

	it("includes tool domain in the prompt message", async () => {
		Object.defineProperty(process.stderr, "isTTY", { value: true, writable: true });
		const consola = await import("consola");
		const promptSpy = vi.spyOn(consola.consola, "prompt").mockResolvedValue("n" as never);

		const tool = makeTool(["write_products"]);
		await confirmMutation(tool, {});

		expect(promptSpy).toHaveBeenCalledWith(expect.stringContaining("products"), expect.any(Object));
	});
});
