import type { ToolDefinition } from "../engine/types.js";

export function defineTool(def: ToolDefinition): Readonly<ToolDefinition> {
	if (!def.graphql && !def.handler) {
		throw new Error(`Tool "${def.name}" must define either "graphql" or "handler" (or both)`);
	}

	return Object.freeze(def);
}
