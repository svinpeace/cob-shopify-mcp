import type { ResourceContent, ResourceDefinition } from "./resource-types.js";

export class ResourceEngine {
	private resources: Map<string, ResourceDefinition> = new Map();

	register(resource: ResourceDefinition): void {
		this.resources.set(resource.uri, resource);
	}

	list(): ResourceDefinition[] {
		return [...this.resources.values()];
	}

	async read(uri: string, ctx: unknown): Promise<ResourceContent> {
		for (const [template, resource] of this.resources) {
			const params = matchUriTemplate(template, uri);
			if (params) {
				return resource.handler(params, ctx);
			}
		}
		throw new Error(`No resource matches URI: ${uri}`);
	}
}

function matchUriTemplate(template: string, uri: string): Record<string, string> | null {
	const paramNames: string[] = [];
	const regexStr = template.replace(/\{([^}]+)\}/g, (_match, name) => {
		paramNames.push(name);
		return "([^/]+)";
	});
	const regex = new RegExp(`^${regexStr}$`);
	const match = uri.match(regex);
	if (!match) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < paramNames.length; i++) {
		params[paramNames[i]] = match[i + 1];
	}
	return params;
}
