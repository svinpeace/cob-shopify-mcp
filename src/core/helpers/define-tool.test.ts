import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool } from "./define-tool.js";

describe("defineTool", () => {
	it("returns frozen ToolDefinition for valid graphql tool", () => {
		const tool = defineTool({
			name: "list_products",
			domain: "products",
			tier: 1,
			description: "List products",
			scopes: ["read_products"],
			input: { limit: z.number().default(10) },
			graphql: "query { products { edges { node { id } } } }",
		});

		expect(tool.name).toBe("list_products");
		expect(Object.isFrozen(tool)).toBe(true);
	});

	it("returns frozen ToolDefinition for valid handler tool", () => {
		const tool = defineTool({
			name: "low_stock_report",
			domain: "analytics",
			tier: 1,
			description: "Low stock report",
			scopes: ["read_products"],
			input: { threshold: z.number() },
			handler: async () => ({ items: [] }),
		});

		expect(tool.name).toBe("low_stock_report");
		expect(Object.isFrozen(tool)).toBe(true);
	});

	it("throws when neither graphql nor handler provided", () => {
		expect(() =>
			defineTool({
				name: "broken_tool",
				domain: "products",
				tier: 1,
				description: "Broken",
				scopes: [],
				input: {},
			}),
		).toThrow('must define either "graphql" or "handler"');
	});

	it("accepts tool with both graphql and handler", () => {
		const tool = defineTool({
			name: "dual_tool",
			domain: "products",
			tier: 1,
			description: "Dual tool",
			scopes: ["read_products"],
			input: {},
			graphql: "query { products { id } }",
			handler: async () => ({}),
		});

		expect(tool.graphql).toBeDefined();
		expect(tool.handler).toBeDefined();
	});

	it("preserves all fields", () => {
		const handler = async () => ({});
		const response = (data: any) => data;
		const tool = defineTool({
			name: "test_tool",
			domain: "orders",
			tier: 2,
			description: "A test tool",
			scopes: ["read_orders", "write_orders"],
			input: { id: z.string() },
			graphql: "query { order { id } }",
			handler,
			response,
		});

		expect(tool.name).toBe("test_tool");
		expect(tool.domain).toBe("orders");
		expect(tool.tier).toBe(2);
		expect(tool.description).toBe("A test tool");
		expect(tool.scopes).toEqual(["read_orders", "write_orders"]);
		expect(tool.input).toHaveProperty("id");
		expect(tool.graphql).toBe("query { order { id } }");
		expect(tool.handler).toBe(handler);
		expect(tool.response).toBe(response);
	});
});
