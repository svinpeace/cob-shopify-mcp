export interface PromptDefinition {
	name: string;
	description: string;
	arguments: PromptArgument[];
	handler: (args: Record<string, string>, ctx: unknown) => Promise<PromptMessage[]>;
}

export interface PromptArgument {
	name: string;
	description: string;
	required: boolean;
}

export interface PromptMessage {
	role: "user" | "assistant";
	content: { type: "text"; text: string };
}
