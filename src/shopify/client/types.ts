import type { ShopifyCostData } from "@core/observability/types.js";

export interface ShopifyQueryResult {
	data: unknown;
	cost: ShopifyCostData | null;
}

export interface ShopifyClientConfig {
	storeDomain: string;
	apiVersion: string;
	authProvider: { getToken(storeDomain: string): Promise<string> };
	costTracker: { recordCall(cost: ShopifyCostData): void };
	logger: {
		debug(msg: string, ...args: unknown[]): void;
		warn(msg: string, ...args: unknown[]): void;
		error(msg: string, ...args: unknown[]): void;
	};
	cache?: { readTtl: number; searchTtl: number; analyticsTtl: number };
	rateLimit?: { respectShopifyCost: boolean; maxConcurrent: number };
}

export type QueryType = "read" | "search" | "mutation" | "analytics";
