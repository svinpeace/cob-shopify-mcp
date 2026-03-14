import { ShopifyClient } from "./shopify-client.js";
import type { ShopifyClientConfig } from "./types.js";

export function createShopifyClient(config: ShopifyClientConfig): ShopifyClient {
	return new ShopifyClient(config);
}
