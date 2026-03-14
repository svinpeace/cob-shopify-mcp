import type { ExecutionContext } from "@core/engine/types.js";
import { defineResource } from "@core/helpers/define-resource.js";
import graphql from "./shop-currencies.graphql";

export const shopCurrenciesResource = defineResource({
	uri: "shopify://shop/{domain}/currencies",
	name: "shop-currencies",
	description: "Shop base currency and enabled presentment currencies",
	mimeType: "application/json",
	async handler(params: Record<string, string>, ctx: unknown) {
		const { shopify } = ctx as ExecutionContext;
		const result = await shopify.query(graphql);
		return {
			uri: `shopify://shop/${params.domain}/currencies`,
			mimeType: "application/json",
			text: JSON.stringify(result.data, null, 2),
		};
	},
});
