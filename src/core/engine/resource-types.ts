export interface ResourceDefinition {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
	handler: (params: Record<string, string>, ctx: unknown) => Promise<ResourceContent>;
}

export interface ResourceContent {
	uri: string;
	mimeType: string;
	text: string;
}
