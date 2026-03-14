import type { ShopifyCostData } from "@core/observability/types.js";
import { createAdminApiClient } from "@shopify/admin-api-client";
import { QueryCache } from "./query-cache.js";
import { RateLimiter } from "./rate-limiter.js";
import { withRetry } from "./retry.js";
import type { QueryType, ShopifyClientConfig, ShopifyQueryResult } from "./types.js";

export class ShopifyClient {
	private rateLimiter: RateLimiter;
	private cache: QueryCache;
	private config: ShopifyClientConfig;
	private cachedToken: string | null = null;
	private adminClient: ReturnType<typeof createAdminApiClient> | null = null;

	constructor(config: ShopifyClientConfig) {
		this.config = config;
		this.rateLimiter = new RateLimiter(config.rateLimit);
		this.cache = new QueryCache();
	}

	async query(
		graphql: string,
		variables?: Record<string, unknown>,
		queryType?: QueryType,
	): Promise<ShopifyQueryResult> {
		const type = queryType ?? "read";

		// 1. Check cache (skip for mutations)
		if (type !== "mutation") {
			const cacheKey = QueryCache.createKey(graphql, variables, this.config.storeDomain);
			const cached = this.cache.get(cacheKey);
			if (cached !== undefined) {
				this.config.logger.debug("Cache hit for query");
				return cached as ShopifyQueryResult;
			}
		}

		// 2. Acquire rate limiter
		await this.rateLimiter.acquire();

		try {
			// 3. Get token from auth provider
			const token = await this.config.authProvider.getToken(this.config.storeDomain);

			// 4. Create or reuse admin client
			if (!this.adminClient || this.cachedToken !== token) {
				this.cachedToken = token;
				this.adminClient = createAdminApiClient({
					storeDomain: this.config.storeDomain,
					apiVersion: this.config.apiVersion,
					accessToken: token,
				});
			}

			const client = this.adminClient;

			// 5. Execute query with retry
			const response = await withRetry(async () => {
				const result = await client.request(graphql, {
					variables: variables as Record<string, any>,
				});
				return result;
			});

			// 6. Check for GraphQL errors
			if (response.errors) {
				const gqlErrors = response.errors.graphQLErrors;
				if (gqlErrors && gqlErrors.length > 0) {
					const messages = gqlErrors.map((e: { message?: string }) => e.message ?? "Unknown GraphQL error").join("; ");
					throw new Error(`GraphQL errors: ${messages}`);
				}
				if (response.errors.message) {
					throw new Error(`GraphQL error: ${response.errors.message}`);
				}
				if (response.errors.networkStatusCode) {
					throw new Error(`Network error: status ${response.errors.networkStatusCode}`);
				}
			}

			// 7. Extract cost from extensions.cost
			const cost: ShopifyCostData | null = (response.extensions?.cost as ShopifyCostData) ?? null;

			// 8. Update rate limiter from cost
			if (cost) {
				this.rateLimiter.updateFromResponse(cost);
			}

			// 9. Report cost to costTracker
			if (cost) {
				this.config.costTracker.recordCall(cost);
			}

			const result: ShopifyQueryResult = {
				data: response.data ?? null,
				cost,
			};

			// 10. Cache result if applicable (skip mutations)
			if (type !== "mutation") {
				const ttl = this.getTtlForQueryType(type);
				if (ttl > 0) {
					const cacheKey = QueryCache.createKey(graphql, variables, this.config.storeDomain);
					this.cache.set(cacheKey, result, ttl);
				}
			}

			return result;
		} finally {
			// 11. Release rate limiter
			this.rateLimiter.release();
		}
	}

	invalidateCache(pattern?: string): void {
		this.cache.invalidate(pattern);
	}

	private getTtlForQueryType(type: QueryType): number {
		const cacheConfig = this.config.cache;
		if (!cacheConfig) return 30; // default read TTL

		switch (type) {
			case "read":
				return cacheConfig.readTtl;
			case "search":
				return cacheConfig.searchTtl;
			case "analytics":
				return cacheConfig.analyticsTtl;
			default:
				return 0;
		}
	}
}
