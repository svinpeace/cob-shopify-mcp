# FEAT-009: Shopify GraphQL Client & Cost Engine

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Client |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-002, FEAT-003, FEAT-005 |
| **Blocks** | FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, GraphQL queries execute against the Shopify Admin API with automatic auth injection
- As a developer, I see per-query cost data (`requestedQueryCost`, `actualQueryCost`, `throttleStatus`) in every response
- As a developer, the client respects Shopify's cost-based rate limits automatically
- As a developer, read queries are cached with configurable TTL to reduce API calls
- As a developer, failed queries are retried with exponential backoff on 429/5xx errors

---

## 1. Executive Context

**Product Intent:** Provide a robust, production-grade Shopify GraphQL client that handles authentication, rate limiting, caching, retries, and cost tracking transparently. Every tool built on this client inherits these capabilities without any per-tool configuration.

**System Position:** `src/shopify/client/`. This is the bridge between the core tool engine (FEAT-006) and the Shopify Admin GraphQL API. Tools call `ctx.shopify.query()` — this module implements that method. It uses `@shopify/admin-api-client` (createAdminApiClient) for the actual HTTP calls and wraps it with rate limiting, cache, retry, and cost tracking layers.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty `src/shopify/client/` directory. FEAT-002 config with `shopify.api_version`, `shopify.cache` TTLs, `rate_limit.*` settings. FEAT-003 `CostTracker` class. FEAT-005 `AuthProvider` for token retrieval.

### What Must Be Built

1. **Shopify Client** (`src/shopify/client/shopify-client.ts`)
   - Wraps `@shopify/admin-api-client` `createAdminApiClient`
   - `query(graphql: string, variables?: Record<string, unknown>): Promise<ShopifyQueryResult>`
   - Injects access token from `AuthProvider.getToken(storeDomain)`
   - Extracts `extensions.cost` from every GraphQL response
   - Reports cost to `CostTracker.recordCall()`
   - Returns data + cost together in `ShopifyQueryResult`
   - Handles GraphQL-level errors (errors array in response) with structured error messages
   - Uses configured `shopify.api_version` (default `2026-01`)

2. **Rate Limiter** (`src/shopify/client/rate-limiter.ts`)
   - `RateLimiter` class — cost-based throttle matching Shopify's bucket model
   - Bucket capacity: ~1000 points per store (from `throttleStatus.maximumAvailable`)
   - Refill rate: 50 points/sec (from `throttleStatus.restoreRate`)
   - `acquire(estimatedCost?: number): Promise<void>` — blocks if bucket too low
   - Updates bucket state from `throttleStatus.currentlyAvailable` in each response
   - Configurable: `rate_limit.respect_shopify_cost` (default true)
   - Configurable: `rate_limit.max_concurrent` (default 10) — semaphore for parallel queries

3. **Query Cache** (`src/shopify/client/query-cache.ts`)
   - `QueryCache` class — in-memory TTL-based cache
   - Cache key: `sha256(query + JSON.stringify(variables) + storeDomain)`
   - TTLs from config:
     - Read queries: 30 seconds (`shopify.cache.read_ttl`)
     - Search queries: 10 seconds (`shopify.cache.search_ttl`)
     - Analytics queries: 5 minutes (`shopify.cache.analytics_ttl`)
   - Mutations: NEVER cached
   - `get(key: string): CachedResult | undefined`
   - `set(key: string, value: CachedResult, ttl: number): void`
   - `invalidate(pattern?: string): void` — clear cache, optionally by key pattern
   - Cache hit/miss logged via observability logger

4. **Retry Handler** (`src/shopify/client/retry.ts`)
   - `withRetry(fn: () => Promise<T>, options: RetryOptions): Promise<T>`
   - Retries on HTTP 429 (rate limited) and 5xx (server errors)
   - Exponential backoff: 1s, 2s, 4s (max 3 retries)
   - Respects `Retry-After` header when present
   - Does NOT retry on 4xx client errors (except 429)
   - Logs retry attempts via observability logger

5. **Client Types** (`src/shopify/client/types.ts`)
   ```typescript
   interface ShopifyQueryResult {
     data: unknown
     cost: ShopifyCostData | null       // null if cost not in response
   }

   interface ShopifyClientConfig {
     storeDomain: string
     apiVersion: string
     authProvider: AuthProvider
     costTracker: CostTracker
     logger: Logger
     cache?: { readTtl: number; searchTtl: number; analyticsTtl: number }
     rateLimit?: { respectShopifyCost: boolean; maxConcurrent: number }
   }

   type QueryType = 'read' | 'search' | 'mutation' | 'analytics'
   ```

6. **Client Factory** (`src/shopify/client/factory.ts`)
   - `createShopifyClient(config: ShopifyClientConfig): ShopifyClient`
   - Wires auth, rate limiter, cache, retry, cost tracker together
   - Returns the client instance used by `ExecutionContext.shopify`

7. **Barrel Export** (`src/shopify/client/index.ts`)

### Risk Assessment
- **Cost data extraction:** Shopify returns cost in `extensions.cost` — must handle cases where it's missing (e.g., introspection queries, errors).
- **Cache invalidation:** Mutations should invalidate related cache entries. For v1, mutations just bypass cache; explicit invalidation can be added later.
- **Rate limiter accuracy:** Bucket state drifts between requests. Use the authoritative `currentlyAvailable` from each response to re-sync.
- **Concurrent query limit:** `maxConcurrent` semaphore prevents overwhelming the API with parallel tool calls.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §5 | Shopify client design |
| 2 | Shopify API Rate Limits (https://shopify.dev/docs/api/usage/limits) | Cost-based throttle reference |

---

## 4. Scope Guardrails

### In Scope
- Shopify GraphQL client wrapping `@shopify/admin-api-client`
- Auth token injection from AuthProvider
- Cost-based rate limiter matching Shopify's bucket model
- In-memory TTL-based query cache
- Retry with exponential backoff on 429/5xx
- Cost data extraction and CostTracker integration
- Client factory
- Unit tests for all components (mock HTTP responses)

### Out of Scope
- REST API support (GraphQL only)
- Persistent cache (Redis, filesystem) — in-memory only for v1
- Cache invalidation on mutation (bypass only for v1)
- Webhook-triggered cache invalidation
- GraphQL query validation/introspection
- Batch/bulk query operations

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/client/types.ts` | Client types |
| Create | `src/shopify/client/shopify-client.ts` | Core GraphQL client |
| Create | `src/shopify/client/rate-limiter.ts` | Cost-based rate limiter |
| Create | `src/shopify/client/query-cache.ts` | TTL-based query cache |
| Create | `src/shopify/client/retry.ts` | Retry with backoff |
| Create | `src/shopify/client/factory.ts` | Client factory |
| Create | `src/shopify/client/index.ts` | Barrel export |
| Create | `src/shopify/client/shopify-client.test.ts` | Client tests |
| Create | `src/shopify/client/rate-limiter.test.ts` | Rate limiter tests |
| Create | `src/shopify/client/query-cache.test.ts` | Cache tests |
| Create | `src/shopify/client/retry.test.ts` | Retry tests |
| Delete | `src/shopify/client/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `ShopifyClient.query()` executes GraphQL against Shopify Admin API
- [ ] Client injects auth token via AuthProvider
- [ ] Client extracts `extensions.cost` from every response
- [ ] Client reports cost to CostTracker after each call
- [ ] Client returns `ShopifyQueryResult` with data + cost
- [ ] Client handles GraphQL errors (errors array) with structured error messages
- [ ] Rate limiter blocks when `currentlyAvailable` is near zero
- [ ] Rate limiter updates state from each response's `throttleStatus`
- [ ] Rate limiter enforces `maxConcurrent` parallel query limit
- [ ] Cache returns cached result for identical query+variables within TTL
- [ ] Cache uses different TTLs for read, search, analytics queries
- [ ] Cache never caches mutations
- [ ] Cache key uses sha256 of query + variables + storeDomain
- [ ] Retry retries on 429 with `Retry-After` header respect
- [ ] Retry retries on 5xx with exponential backoff
- [ ] Retry does not retry on 4xx (except 429)
- [ ] Retry stops after 3 attempts
- [ ] All types exported from barrel index

---

## 7. Required Test Enforcement

### ShopifyClient Tests (`src/shopify/client/shopify-client.test.ts`)
```
- query sends GraphQL to correct endpoint with auth header
- query extracts cost data from extensions.cost
- query reports cost to CostTracker
- query returns data + cost in ShopifyQueryResult
- query handles missing extensions.cost gracefully (cost = null)
- query throws structured error for GraphQL errors array
- query uses configured api_version in endpoint URL
```

### Rate Limiter Tests (`src/shopify/client/rate-limiter.test.ts`)
```
- acquire resolves immediately when bucket has capacity
- acquire blocks when bucket is near zero
- updateFromResponse updates bucket from throttleStatus
- maxConcurrent limits parallel queries (semaphore)
- disabled when respectShopifyCost is false
```

### Query Cache Tests (`src/shopify/client/query-cache.test.ts`)
```
- get returns undefined for cache miss
- set + get roundtrip returns cached value
- cached value expires after TTL
- different variables produce different cache keys
- invalidate clears all entries
- cache key includes storeDomain
```

### Retry Tests (`src/shopify/client/retry.test.ts`)
```
- succeeds on first try — no retry
- retries on 429 and succeeds on second try
- retries on 500 with exponential backoff
- respects Retry-After header
- does not retry on 400 (client error)
- stops after 3 retries and throws
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §5 (Shopify client)
2. Read `@shopify/admin-api-client` API — `createAdminApiClient`, `request()` method
3. Research Shopify `extensions.cost` response structure
4. Research Shopify rate limit headers and `Retry-After` behavior
5. Design the client layer architecture (query flow through rate limiter → cache → client → retry)
6. **STOP — present client design**

### Session 2: Implement Core Client + Rate Limiter
1. Write `types.ts`
2. Write `rate-limiter.ts`
3. Write `rate-limiter.test.ts` — run, verify pass
4. Write `retry.ts`
5. Write `retry.test.ts` — run, verify pass
6. **STOP**

### Session 3: Implement Cache + Client
1. Write `query-cache.ts`
2. Write `query-cache.test.ts` — run, verify pass
3. Write `shopify-client.ts` (integrates rate limiter, cache, retry)
4. Write `shopify-client.test.ts` — run, verify pass
5. **STOP**

### Session 4: Factory + Finalize
1. Write `factory.ts`
2. Write `index.ts` barrel
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(shopify-client): add GraphQL client with rate limiter, cache, retry, and cost tracking`
6. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Cost tracking works end-to-end (query → extract cost → report to CostTracker)
- [ ] Rate limiter correctly reflects Shopify's bucket model
- [ ] Cache uses correct TTLs per query type
- [ ] Retry respects Retry-After and exponential backoff
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
