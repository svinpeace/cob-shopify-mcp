import type { PromptDefinition } from "../engine/prompt-types.js";

export function definePrompt(def: PromptDefinition): PromptDefinition {
	if (!def.name) throw new Error("Prompt must have a name");
	if (!def.handler) throw new Error("Prompt must have a handler");
	return Object.freeze({ ...def, arguments: [...def.arguments] });
}
