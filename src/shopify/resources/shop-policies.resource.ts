import type { ExecutionContext } from "@core/engine/types.js";
import { defineResource } from "@core/helpers/define-resource.js";
import graphql from "./shop-policies.graphql";

export const shopPoliciesResource = defineResource({
	uri: "shopify://shop/{domain}/policies",
	name: "shop-policies",
	description: "Shop privacy policy, refund policy, and terms of service",
	mimeType: "application/json",
	async handler(params: Record<string, string>, ctx: unknown) {
		const { shopify } = ctx as ExecutionContext;
		const result = await shopify.query(graphql);
		return {
			uri: `shopify://shop/${params.domain}/policies`,
			mimeType: "application/json",
			text: JSON.stringify(result.data, null, 2),
		};
	},
});
