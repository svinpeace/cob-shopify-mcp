# cob-shopify-mcp — Architecture Design Document

**Date:** 2026-03-14
**Status:** Approved
**Package:** `cob-shopify-mcp`

---

## 1. Overview

A production-grade, open-source MCP (Model Context Protocol) server that bridges AI systems to the entire Shopify Admin GraphQL API. Designed for developer adoption — zero-friction setup, config-driven extensibility, safe defaults.

**Distribution:** npm (`npx cob-shopify-mcp`) + Docker
**Architecture:** Core + Shell (API-agnostic engine + Shopify-specific implementation)
**Goal:** The definitive Shopify MCP server on GitHub — best DX, full API coverage, community-loved.

---

## 2. Architecture

### 2.1 Core + Shell Pattern

```
src/
├── core/                         # Generic MCP engine (API-agnostic)
│   ├── engine/                   # Tool, Resource, Prompt engines
│   ├── registry/                 # Barrel-based registration, config filter, plugin loader
│   ├── helpers/                  # defineTool(), defineResource(), definePrompt()
│   ├── transport/                # stdio + Streamable HTTP
│   ├── auth/                     # Auth provider interface
│   ├── storage/                  # Storage backend interface + JSON + SQLite impls
│   ├── config/                   # Config schema (Zod) + loader
│   └── observability/            # Logger, audit trail, metrics
│
├── shopify/                      # Shopify-specific shell
│   ├── client/                   # GraphQL client, rate limiter, cache, retry
│   ├── tools/                    # Co-located: tool.ts + .graphql + .test.ts
│   │   ├── products/             # 15 tools
│   │   ├── orders/               # 12 tools
│   │   ├── customers/            # 9 tools
│   │   ├── inventory/            # 7 tools
│   │   ├── analytics/            # 6 tools
│   │   └── _disabled/            # Tier 2 tools (billing, payments, themes, etc.)
│   ├── resources/                # MCP resources (shop info, locations, policies, currencies)
│   ├── prompts/                  # MCP prompt templates
│   └── defaults.config.yaml     # Default tier activation
│
├── server/                       # Wires core + shopify, creates McpServer
├── cli/                          # CLI commands (citty)
└── index.ts                      # Main entry point
```

**Key principle:** `core/` knows nothing about Shopify. `shopify/` is the only layer that imports Shopify packages. This enables future reuse of the core for other API MCPs.

### 2.2 System Flow

```
Entry Points (CLI / stdio / HTTP)
        │
        ▼
    Core Engine
    ├── Registry ← barrel exports from shopify/tools/ + config filter
    ├── Tool Engine ← Zod validate → execute → response map
    ├── Resource Engine
    ├── Prompt Engine
    ├── Auth Manager ← provides tokens to Shopify client
    ├── Storage ← JSON or SQLite backend
    └── Observability ← pino logger, audit trail
        │
        ▼
    Shopify Shell
    ├── GraphQL Client (@shopify/admin-api-client)
    │   ├── Rate Limiter (cost-based, Shopify bucket model)
    │   ├── Cache (TTL-based, per-query)
    │   └── Retry (exponential backoff on 429/5xx)
    └── Tool Definitions (co-located .tool.ts + .graphql + .test.ts)
        │
        ▼
    Shopify Admin GraphQL API (v2026-01)
```

---

## 3. Config-Driven Tool Engine

### 3.1 Tool Definition Format

**Built-in tools: TypeScript with `defineTool()`**

```typescript
import { defineTool } from '@core/helpers/define-tool'
import { z } from 'zod'
import query from './list-products.graphql'

export default defineTool({
  name: 'list_products',
  domain: 'products',
  tier: 1,
  description: 'List products with filtering and pagination',
  scopes: ['read_products'],
  input: {
    limit: z.number().min(1).max(250).default(10),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
    vendor: z.string().optional(),
    cursor: z.string().optional(),
  },
  graphql: query,
  response: (data) => ({
    products: data.products.edges.map((e: any) => e.node),
    pageInfo: data.products.pageInfo,
  }),
})
```

**Complex tools with custom handler:**

```typescript
export default defineTool({
  name: 'low_stock_report',
  domain: 'analytics',
  tier: 1,
  description: 'Products below a stock threshold',
  scopes: ['read_products', 'read_inventory'],
  input: {
    threshold: z.number().min(0).default(10),
    limit: z.number().min(1).max(100).default(25),
  },
  handler: async (input, ctx) => {
    const data = await ctx.shopify.query(query, { first: input.limit })
    const lowStock = data.inventoryItems.edges
      .map((e: any) => e.node)
      .filter((item: any) => item.inventoryLevel.available <= input.threshold)
    return { count: lowStock.length, threshold: input.threshold, items: lowStock }
  },
})
```

**Custom runtime tools (user-added): YAML**

```yaml
name: get_metafields
domain: metafields
tier: 3
description: Get metafields for a resource
scopes: [read_metafields]
input:
  owner_id:
    type: string
    required: true
  namespace:
    type: string
graphql: |
  query GetMetafields($ownerId: ID!, $namespace: String) {
    metafields(ownerId: $ownerId, namespace: $namespace, first: 50) {
      edges { node { key value namespace type } }
    }
  }
response:
  mapping: data.metafields.edges[].node
```

### 3.2 Registration

Built-in tools use **barrel exports** (no filesystem scanning):

```typescript
// shopify/tools/products/index.ts
export { default as listProducts } from './list-products.tool'
export { default as getProduct } from './get-product.tool'
// ...

// shopify/tools/index.ts
export * as products from './products'
export * as orders from './orders'
// ...

// server/register-tools.ts
import * as allTools from '@shopify/tools'
for (const [domain, tools] of Object.entries(allTools)) {
  for (const tool of Object.values(tools)) {
    registry.register(tool)
  }
}
```

Custom YAML tools loaded at runtime from `config.tools.custom_paths`.

### 3.3 Tier System & Config Precedence

```
read_only: true  →  disables ALL write tools (highest priority)
    ↓
disable: [tool_name]  →  explicitly disabled
    ↓
enable: [tool_name]  →  explicitly enabled (overrides tier default)
    ↓
tier defaults  →  tier 1 = on, tier 2 = off, tier 3 = on (custom)
```

**Tier definitions:**
- **Tier 1 (enabled):** Safe operations — Products CRUD, Orders CRUD, Customers R/W, Inventory R/W, Analytics
- **Tier 2 (disabled):** Sensitive operations — Billing, Payments, Themes, Store Config, Payouts, etc.
- **Tier 3 (enabled):** User-added custom tools

---

## 4. Authentication

### 4.1 Auth Provider Interface

```typescript
interface AuthProvider {
  type: 'static' | 'client-credentials' | 'authorization-code'
  getToken(storeDomain: string): Promise<string>
  refresh?(storeDomain: string): Promise<string>
  validate(storeDomain: string): Promise<boolean>
}
```

### 4.2 Three Auth Strategies

| Strategy | How | Token Lifecycle |
|---|---|---|
| **Static token** | `SHOPIFY_ACCESS_TOKEN` env var | No refresh, permanent |
| **Client credentials** (recommended) | `client_id` + `client_secret` → POST to Shopify token endpoint | 24hr TTL, auto-refresh |
| **Authorization code** (public apps) | Browser redirect → merchant approval → token exchange | Offline token, permanent |

### 4.3 Auth Detection

Auto-detected from config/env:
- `SHOPIFY_ACCESS_TOKEN` present → static token
- `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` present → client credentials (default) or authorization code (`--auth-code` flag)

### 4.4 Token Storage

| Backend | Location | Encryption | CLI Warning |
|---|---|---|---|
| JSON (default) | `~/.cob-shopify-mcp/tokens.json` | None | "Tokens stored in plaintext. Use --storage sqlite for encryption." |
| SQLite | `~/.cob-shopify-mcp/store.db` | AES-256-GCM (Node crypto) | None |

---

## 5. Shopify GraphQL Client

### 5.1 Client Stack

```
@shopify/admin-api-client (createAdminApiClient)
    │
    ├── Auth Injection ── X-Shopify-Access-Token header
    ├── Rate Limiter ── cost-based (Shopify's point bucket model)
    ├── Cache ── TTL-based, per-query+variables hash
    └── Retry ── exponential backoff, max 3 retries on 429/5xx
```

### 5.2 Rate Limiting (Cost-Based)

Shopify GraphQL uses a point-based throttle:
- Bucket capacity: ~1000 points per store
- Refill rate: 50 points/sec
- Each query has a cost (returned in `extensions.cost`)
- Rate limiter reads `currentlyAvailable` from response, blocks when near zero

### 5.3 Cache Strategy

| Operation Type | Cached | Default TTL |
|---|---|---|
| Read queries | Yes | 30 seconds |
| Search queries | Yes | 10 seconds |
| Mutations | Never | — |
| Analytics | Yes | 5 minutes |

Cache key: `sha256(query + JSON.stringify(variables) + storeDomain)`
Configurable TTLs via `config.shopify.cache`.

### 5.4 API Version

Default: `2026-01` (latest stable).
Configurable: `config.shopify.api_version` or `SHOPIFY_API_VERSION` env var.

---

## 6. MCP Server & Transport

### 6.1 Server Setup

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const server = new McpServer({
  name: 'cob-shopify-mcp',
  version: '1.0.0',
  capabilities: { tools: {}, resources: {}, prompts: {} },
})
```

### 6.2 Transports

| Transport | Use Case | Default |
|---|---|---|
| **stdio** | Local MCP clients (Claude Desktop, Cursor, VS Code) | Yes |
| **Streamable HTTP** | Remote/hosted, multi-client, SaaS | No |

### 6.3 Response Format

All responses are normalized JSON — never raw Shopify payloads:
```typescript
{
  content: [{
    type: 'text',
    text: JSON.stringify({
      products: [{ id: '123', title: 'Hoodie', status: 'ACTIVE' }],
      pageInfo: { hasNextPage: true, endCursor: 'abc' }
    })
  }]
}
```

---

## 7. CLI

Built with **citty** (TypeScript-first, zero deps, UnJS ecosystem).

```
cob-shopify-mcp
├── serve              Start MCP server
│   --transport        stdio | http (default: stdio)
│   --port             HTTP port (default: 8787)
│   --config           Config file path
│
├── connect            OAuth flow
│   --store            Store domain
│   --client-id        Shopify client ID
│   --client-secret    Shopify client secret
│   --auth-code        Use authorization code flow (browser redirect)
│
├── tools
│   ├── list           Show all tools with domain, tier, status
│   ├── run <name>     Execute tool: tools run list_products --limit 5
│   └── info <name>    Show tool schema, description, required scopes
│
├── config
│   ├── show           Display resolved config
│   ├── validate       Validate config file
│   └── init           Generate starter config
│
├── stores
│   ├── list           List connected stores
│   ├── status         Check connection health
│   └── remove         Remove stored connection
│
└── --version, --help
```

---

## 8. Observability

Built with **pino** (fastest Node.js structured logger).

### 8.1 Structured Logging

JSON to stderr (stdout reserved for MCP protocol on stdio transport):
```json
{"level":"info","ts":"2026-03-14T12:00:00Z","tool":"list_products","duration_ms":142,"store":"my-store.myshopify.com"}
```

### 8.2 Audit Trail

Every tool invocation logged:
```json
{"tool":"list_products","input":{"limit":10},"store":"my-store","ts":"...","duration_ms":142,"status":"success"}
```

Storage: `~/.cob-shopify-mcp/audit.log` (JSON lines) or SQLite `audit_log` table.

### 8.3 Metrics (Optional)

Off by default. When enabled:
- `tool_invocations_total` — counter per tool
- `tool_duration_ms` — histogram per tool
- `shopify_api_calls_total` — counter
- `shopify_api_errors_total` — counter by error type
- `rate_limit_remaining` — gauge
- `cache_hit_ratio` — gauge

---

## 9. Testing Strategy

Built with **Vitest**.

### 9.1 Test Structure

```
Unit tests:        Co-located (*.test.ts next to *.tool.ts)
Integration tests: tests/integration/ (real Shopify dev store, CI only)
E2E tests:         tests/e2e/ (MCP client → server → Shopify)
```

### 9.2 Test Approach

- **Unit:** Mock Shopify client, test tool logic, config filter, registry, auth
- **Integration:** Real Shopify dev store API calls (requires env vars, CI only)
- **E2E:** Spawn MCP server via stdio, connect MCP client, invoke tools end-to-end

---

## 10. Tool Inventory

### Tier 1 — Enabled by Default (49 tools)

**Products (15):** list_products, get_product, get_product_by_handle, search_products, list_product_variants, get_product_variant, list_collections, get_collection, create_product, create_product_variant, create_collection, update_product, update_product_variant, update_product_status, manage_product_tags

**Orders (12):** list_orders, search_orders, get_order, get_order_by_name, get_order_timeline, get_order_fulfillment_status, create_draft_order, add_order_note, add_order_tag, update_order_tags, update_order_note, mark_order_paid

**Customers (9):** list_customers, search_customers, get_customer, get_customer_orders, get_customer_lifetime_value, create_customer, update_customer, add_customer_tag, remove_customer_tag

**Inventory (7):** get_inventory_item, get_inventory_by_sku, list_inventory_levels, get_location_inventory, low_stock_report, adjust_inventory, set_inventory_level

**Analytics (6):** sales_summary, top_products, orders_by_date_range, refund_rate_summary, repeat_customer_rate, inventory_risk_report

### Tier 2 — Disabled by Default

Billing, payments, payouts, themes, store config, discounts, marketing, metafields, and all remaining Shopify Admin GraphQL API operations. Shipped as tool definitions in `_disabled/`, enabled via config.

### MCP Resources

`shopify://shop/info`, `shopify://shop/locations`, `shopify://shop/policies`, `shopify://shop/currencies`

### MCP Prompts

`store_health_check`, `daily_sales_report`, `inventory_risk_analysis`, `customer_support_summary`

---

## 11. Tech Stack

| Component | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 LTS |
| Language | TypeScript | 5.x (ESM-only) |
| MCP SDK | @modelcontextprotocol/sdk | 1.x |
| Shopify GraphQL | @shopify/admin-api-client | 1.1.x |
| Shopify OAuth | @shopify/shopify-api | 13.x |
| Validation | Zod | 4.x |
| Build | tsup | latest |
| Test | Vitest | latest |
| Lint/Format | Biome | latest |
| Logger | pino | latest |
| CLI | citty | latest |
| Package Manager | pnpm | latest |

---

## 12. Configuration Reference

```yaml
# cob-shopify-mcp.config.yaml

auth:
  method: token                          # token | client-credentials | authorization-code
  store_domain: your-store.myshopify.com
  access_token: ${SHOPIFY_ACCESS_TOKEN}
  # client_id: ${SHOPIFY_CLIENT_ID}
  # client_secret: ${SHOPIFY_CLIENT_SECRET}

shopify:
  api_version: "2026-01"
  max_retries: 3
  cache:
    read_ttl: 30          # seconds
    search_ttl: 10
    analytics_ttl: 300

tools:
  read_only: false
  disable: []
  enable: []
  custom_paths: []

transport:
  type: stdio             # stdio | http
  # port: 8787
  # host: 0.0.0.0

storage:
  backend: json           # json | sqlite
  path: ~/.cob-shopify-mcp/
  # encrypt_tokens: true  # sqlite only

observability:
  log_level: info
  audit_log: true
  metrics: false

rate_limit:
  respect_shopify_cost: true
  max_concurrent: 10
```

Config loaded from (priority order): env vars > `.env` file > `cob-shopify-mcp.config.yaml`

---

## 13. Security

- **Minimal scopes:** Only requests scopes needed by active tools
- **Token encryption:** AES-256-GCM on SQLite backend
- **Audit logging:** Every tool call logged with timestamp, tool, input, duration, status
- **Tier system:** Sensitive ops disabled by default
- **Read-only mode:** One flag disables all mutations
- **Plaintext warning:** CLI warns when JSON backend stores tokens unencrypted
- **No eval:** YAML response mappings use safe path resolution, not eval

---

## 14. Deployment

### npm (primary)
```bash
npx cob-shopify-mcp
npm install -g cob-shopify-mcp
```

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile --prod
COPY dist/ ./dist/
ENTRYPOINT ["node", "dist/index.js"]
```

### Cloud targets
Fly.io, Railway, AWS (ECS/Lambda), GCP (Cloud Run)
