import type { ResourceDefinition } from "@core/engine/resource-types.js";
import {
	shopCurrenciesResource,
	shopInfoResource,
	shopLocationsResource,
	shopPoliciesResource,
} from "@shopify/resources/index.js";

/**
 * Collects all ResourceDefinition instances into a flat array.
 */
export function getAllResources(): ResourceDefinition[] {
	return [shopInfoResource, shopLocationsResource, shopPoliciesResource, shopCurrenciesResource];
}
