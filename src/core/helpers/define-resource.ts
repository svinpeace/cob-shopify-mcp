import type { ResourceDefinition } from "../engine/resource-types.js";

export function defineResource(def: ResourceDefinition): ResourceDefinition {
	if (!def.uri) throw new Error("Resource must have a URI");
	if (!def.name) throw new Error("Resource must have a name");
	if (!def.handler) throw new Error("Resource must have a handler");
	return Object.freeze({ ...def });
}
