import type { PromptDefinition, PromptMessage } from "./prompt-types.js";

export class PromptEngine {
	private prompts: Map<string, PromptDefinition> = new Map();

	register(prompt: PromptDefinition): void {
		this.prompts.set(prompt.name, prompt);
	}

	list(): PromptDefinition[] {
		return [...this.prompts.values()];
	}

	async get(name: string, args: Record<string, string>, ctx: unknown): Promise<PromptMessage[]> {
		const prompt = this.prompts.get(name);
		if (!prompt) throw new Error(`Prompt not found: ${name}`);

		for (const arg of prompt.arguments) {
			if (arg.required && !(arg.name in args)) {
				throw new Error(`Missing required argument: ${arg.name}`);
			}
		}

		return prompt.handler(args, ctx);
	}
}
