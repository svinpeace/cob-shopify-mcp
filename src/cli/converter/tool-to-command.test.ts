import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ToolDefinition } from "../../core/engine/types.js";
import { coerceInput, coerceValue, toolToCommand } from "./tool-to-command.js";

// Helper: create a minimal ToolDefinition for testing
function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		name: "list_products",
		domain: "products",
		tier: 1,
		description: "List products from the store",
		scopes: ["read_products"],
		input: {
			limit: z.number().describe("Max items to return").default(10),
			status: z.enum(["active", "draft", "archived"]).describe("Filter by status").optional(),
			query: z.string().describe("Search query").optional(),
		},
		handler: async (input) => ({ products: [], count: 0, limit: input.limit }),
		...overrides,
	};
}

describe("coerceValue", () => {
	it("coerces string to number for ZodNumber", () => {
		expect(coerceValue("42", z.number())).toBe(42);
	});

	it("coerces string to number for ZodNumber with min/max", () => {
		expect(coerceValue("5", z.number().min(1).max(250))).toBe(5);
	});

	it('coerces "true" string to boolean for ZodBoolean', () => {
		expect(coerceValue("true", z.boolean())).toBe(true);
	});

	it('coerces "false" string to boolean for ZodBoolean', () => {
		expect(coerceValue("false", z.boolean())).toBe(false);
	});

	it("passes through actual boolean for ZodBoolean", () => {
		expect(coerceValue(true, z.boolean())).toBe(true);
		expect(coerceValue(false, z.boolean())).toBe(false);
	});

	it("passes through string for ZodString", () => {
		expect(coerceValue("hello", z.string())).toBe("hello");
	});

	it("passes through string for ZodEnum", () => {
		expect(coerceValue("active", z.enum(["active", "draft"]))).toBe("active");
	});

	it("unwraps ZodOptional and coerces inner type", () => {
		expect(coerceValue("7", z.number().optional())).toBe(7);
	});

	it("unwraps ZodDefault and coerces inner type", () => {
		expect(coerceValue("25", z.number().default(10))).toBe(25);
	});

	it("returns undefined for undefined value", () => {
		expect(coerceValue(undefined, z.number())).toBeUndefined();
	});

	it("returns null for null value", () => {
		expect(coerceValue(null, z.string())).toBeNull();
	});
});

describe("coerceInput", () => {
	it("coerces a full input record", () => {
		const schema = {
			limit: z.number().default(10),
			query: z.string().optional(),
			active: z.boolean().optional(),
		};

		const result = coerceInput(
			{ limit: "5", query: "shoes", active: "true" },
			schema,
		);

		expect(result).toEqual({ limit: 5, query: "shoes", active: true });
	});

	it("skips undefined values", () => {
		const schema = {
			limit: z.number().default(10),
			query: z.string().optional(),
		};

		const result = coerceInput({ limit: "5", query: undefined }, schema);
		expect(result).toEqual({ limit: 5 });
	});

	it("passes through unknown keys not in schema", () => {
		const schema = { limit: z.number() };
		const result = coerceInput({ limit: "5", extra: "value" }, schema);
		expect(result).toEqual({ limit: 5, extra: "value" });
	});

	it("handles empty input", () => {
		const result = coerceInput({}, { limit: z.number() });
		expect(result).toEqual({});
	});
});

describe("toolToCommand", () => {
	it("returns a command with correct meta", () => {
		const tool = makeTool();
		const cmd = toolToCommand(tool, "list");
		expect(cmd.meta?.name).toBe("list");
		expect(cmd.meta?.description).toBe("List products from the store");
	});

	it("includes tool args in command args", () => {
		const tool = makeTool();
		const cmd = toolToCommand(tool, "list");
		const argKeys = Object.keys(cmd.args || {});
		expect(argKeys).toContain("limit");
		expect(argKeys).toContain("status");
		expect(argKeys).toContain("query");
	});

	it("includes global flags in command args", () => {
		const tool = makeTool();
		const cmd = toolToCommand(tool, "list");
		const argKeys = Object.keys(cmd.args || {});
		expect(argKeys).toContain("json");
		expect(argKeys).toContain("fields");
		expect(argKeys).toContain("jq");
		expect(argKeys).toContain("describe");
		expect(argKeys).toContain("dry-run");
		expect(argKeys).toContain("yes");
	});

	it("has a run function", () => {
		const tool = makeTool();
		const cmd = toolToCommand(tool, "list");
		expect(typeof cmd.run).toBe("function");
	});

	it("merges tool args and global flags without collision", () => {
		const tool = makeTool({
			input: {
				id: z.string().describe("Product ID"),
			},
		});
		const cmd = toolToCommand(tool, "get");
		const argKeys = Object.keys(cmd.args || {});
		// Should have both tool arg and all global flags
		expect(argKeys).toContain("id");
		expect(argKeys).toContain("json");
		expect(argKeys).toContain("describe");
		expect(argKeys.length).toBeGreaterThanOrEqual(7); // 1 tool arg + 6 global flags
	});

	it("works with tool that has no input fields", () => {
		const tool = makeTool({ input: {} });
		const cmd = toolToCommand(tool, "list-all");
		const argKeys = Object.keys(cmd.args || {});
		// Should only have global flags
		expect(argKeys.length).toBe(6);
	});
});
