import type { ToolDefinition } from "@core/engine/types.js";
import * as domains from "@shopify/tools/index.js";

/**
 * Collects all ToolDefinition exports from every domain barrel into a flat array.
 */
export function getAllTools(): ToolDefinition[] {
	const allTools: ToolDefinition[] = [];

	for (const domain of Object.values(domains)) {
		for (const tool of Object.values(domain)) {
			if (isToolDefinition(tool)) {
				allTools.push(tool);
			}
		}
	}

	return allTools;
}

function isToolDefinition(value: unknown): value is ToolDefinition {
	if (typeof value !== "object" || value === null) return false;
	const obj = value as Record<string, unknown>;
	return (
		typeof obj.name === "string" &&
		typeof obj.domain === "string" &&
		typeof obj.description === "string" &&
		typeof obj.tier === "number" &&
		Array.isArray(obj.scopes) &&
		typeof obj.input === "object" &&
		obj.input !== null
	);
}
