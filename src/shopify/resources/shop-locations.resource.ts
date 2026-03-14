import type { ExecutionContext } from "@core/engine/types.js";
import { defineResource } from "@core/helpers/define-resource.js";
import graphql from "./shop-locations.graphql";

export const shopLocationsResource = defineResource({
	uri: "shopify://shop/{domain}/locations",
	name: "shop-locations",
	description: "All active and inactive locations for the shop with addresses",
	mimeType: "application/json",
	async handler(params: Record<string, string>, ctx: unknown) {
		const { shopify } = ctx as ExecutionContext;
		const result = await shopify.query(graphql);
		return {
			uri: `shopify://shop/${params.domain}/locations`,
			mimeType: "application/json",
			text: JSON.stringify(result.data, null, 2),
		};
	},
});
