import type { ExecutionContext } from "@core/engine/types.js";
import { defineResource } from "@core/helpers/define-resource.js";
import graphql from "./shop-info.graphql";

export const shopInfoResource = defineResource({
	uri: "shopify://shop/{domain}/info",
	name: "shop-info",
	description: "General shop information including name, email, plan, timezone, and primary domain",
	mimeType: "application/json",
	async handler(params: Record<string, string>, ctx: unknown) {
		const { shopify } = ctx as ExecutionContext;
		const result = await shopify.query(graphql);
		return {
			uri: `shopify://shop/${params.domain}/info`,
			mimeType: "application/json",
			text: JSON.stringify(result.data, null, 2),
		};
	},
});
