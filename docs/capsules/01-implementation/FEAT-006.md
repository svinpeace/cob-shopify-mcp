# FEAT-006: Core Tool Engine & Registry

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Engine |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-001, FEAT-002, FEAT-003 |
| **Blocks** | FEAT-009, FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014, FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can define a tool using `defineTool()` with Zod input schema and GraphQL query
- As a developer, I can define a complex tool with a custom handler function
- As a developer, tools are auto-filtered based on my config (tiers, enable/disable, read_only)
- As a developer, I see Zod validation errors when I pass invalid input to a tool
- As a developer, I can add custom YAML tool definitions at runtime

---

## 1. Executive Context

**Product Intent:** Provide the core tool execution pipeline — the beating heart of the MCP server. Tools are defined declaratively (TypeScript `defineTool()` or YAML), registered via barrel exports, filtered by config, validated by Zod, executed against the Shopify GraphQL API, and returned with cost metadata. The engine is API-agnostic; it doesn't know about Shopify — it just orchestrates tool definitions.

**System Position:** `src/core/engine/`, `src/core/registry/`, `src/core/helpers/`. The tool engine is consumed by the MCP server (FEAT-015) to wire tools to `McpServer.tool()` calls. The registry is populated by barrel exports from `@shopify/tools` (FEAT-010+). The `defineTool()` helper lives in `@core/helpers` and is imported by every tool definition.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty `src/core/engine/`, `src/core/registry/`, `src/core/helpers/` directories. FEAT-002 config system with `tools.read_only`, `tools.disable`, `tools.enable`, `tools.custom_paths`. FEAT-003 observability with `AuditLogger` and `CostTracker`.

### What Must Be Built

1. **Tool Types** (`src/core/engine/types.ts`)
   ```typescript
   interface ToolDefinition {
     name: string                    // unique identifier (snake_case)
     domain: string                  // product domain (products, orders, etc.)
     tier: 1 | 2 | 3                // visibility tier
     description: string             // user-facing description
     scopes: string[]                // required OAuth scopes
     input: Record<string, ZodType>  // Zod schema for parameters
     graphql?: string                // optional GraphQL query string
     handler?: (input: any, ctx: ExecutionContext) => Promise<any>
     response?: (data: any) => any   // optional response mapper
   }

   interface ExecutionContext {
     shopify: { query: (query: string, variables?: Record<string, unknown>) => Promise<any> }
     config: CobConfig
     storage: StorageBackend
     logger: Logger
     costTracker: CostTracker
   }

   interface ToolResult {
     data: unknown
     _cost?: ShopifyCostData
     _session?: SessionCostStats
   }
   ```

2. **defineTool() Helper** (`src/core/helpers/define-tool.ts`)
   - Accepts a `ToolDefinition` object and returns it with type safety
   - Validates that either `graphql` or `handler` is provided (not neither)
   - Freezes the definition (immutable after creation)
   - Converts the `input` record into a proper Zod object schema for MCP registration
   ```typescript
   export function defineTool(def: ToolDefinitionInput): ToolDefinition
   ```

3. **Tool Registry** (`src/core/registry/tool-registry.ts`)
   - `ToolRegistry` class
   - `register(tool: ToolDefinition)` — adds tool, throws on duplicate name
   - `get(name: string): ToolDefinition | undefined` — retrieve by name
   - `getAll(): ToolDefinition[]` — all registered tools
   - `getByDomain(domain: string): ToolDefinition[]` — tools in a domain
   - `filter(config: CobConfig): ToolDefinition[]` — applies config filtering
   - Config filtering logic (§3.3 precedence):
     1. If `tools.read_only: true` → exclude tools with mutation scopes (`write_*`)
     2. If tool name in `tools.disable` → exclude
     3. If tool name in `tools.enable` → include (overrides tier default)
     4. Tier defaults: tier 1 = enabled, tier 2 = disabled, tier 3 = enabled

4. **YAML Tool Loader** (`src/core/registry/yaml-loader.ts`)
   - Loads custom tool definitions from YAML files
   - Paths from `config.tools.custom_paths`
   - Parses YAML into `ToolDefinition` objects
   - Validates required fields (name, domain, description, scopes, input, graphql)
   - YAML tools are always tier 3
   - Converts YAML input schema to Zod types (string, number, boolean, enum, array)

5. **Tool Engine** (`src/core/engine/tool-engine.ts`)
   - `ToolEngine` class — orchestrates tool execution
   - `execute(toolName: string, input: unknown, ctx: ExecutionContext): Promise<ToolResult>`
   - Execution pipeline:
     1. Retrieve tool from registry → throw if not found
     2. Build Zod object schema from tool's `input` → validate input → throw with friendly errors
     3. If tool has `handler` → call `handler(validatedInput, ctx)`
     4. If tool has `graphql` (no handler) → call `ctx.shopify.query(graphql, validatedInput)` → apply `response()` mapper if defined
     5. Wrap result in `ToolResult` with cost data from `ctx.costTracker`
     6. Log to audit trail via `ctx.logger`
     7. Return `ToolResult`
   - Error handling: catches all errors, wraps in structured error with tool name and input context

6. **Barrel Exports** (`src/core/helpers/index.ts`, `src/core/registry/index.ts`, `src/core/engine/index.ts`)

### User Workflow — Defining a Simple Tool
```typescript
// shopify/tools/products/list-products.tool.ts
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
    cursor: z.string().optional(),
  },
  graphql: query,
  response: (data) => ({
    products: data.products.edges.map((e: any) => e.node),
    pageInfo: data.products.pageInfo,
  }),
})
```

### User Workflow — Defining a Complex Tool
```typescript
// shopify/tools/analytics/low-stock-report.tool.ts
import { defineTool } from '@core/helpers/define-tool'
import { z } from 'zod'
import query from './low-stock-report.graphql'

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

### User Workflow — Custom YAML Tool
```yaml
# ~/.cob-shopify-mcp/tools/get-metafield.yaml
name: get_metafield
domain: metafields
description: Get a metafield by namespace and key
scopes:
  - read_metafields
input:
  owner_id:
    type: string
    description: GID of the resource that owns the metafield
    required: true
  namespace:
    type: string
    description: Metafield namespace
    required: true
  key:
    type: string
    description: Metafield key
    required: true
graphql: |
  query GetMetafield($ownerId: ID!, $namespace: String!, $key: String!) {
    metafield(ownerId: $ownerId, namespace: $namespace, key: $key) {
      id namespace key value type
    }
  }
response:
  mapping: data.metafield
```

### Risk Assessment
- **defineTool() type safety:** Must accept both `graphql` + `response` tools and `handler` tools. TypeScript overloads or discriminated union needed.
- **YAML input → Zod conversion:** YAML can only describe simple types. Complex validators (regex, min/max) need a YAML DSL subset. Keep it simple — string, number, boolean, enum, array with optional `min`, `max`, `default`, `required`.
- **Config filter mutation safety:** `read_only` check must reliably identify write tools. Use scope prefix `write_` as the signal.
- **Tool name uniqueness:** Registry must reject duplicate names across all domains including YAML tools.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §3 | Tool engine design, defineTool(), tiers, registration |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §2 | Architecture overview, system flow |

---

## 4. Scope Guardrails

### In Scope
- `ToolDefinition` interface and related types
- `defineTool()` helper function with validation
- `ToolRegistry` class with register, get, filter
- Config-driven filtering (read_only, disable, enable, tier defaults)
- `ToolEngine` class with validate → execute → map pipeline
- YAML tool loader for custom runtime tools
- `ExecutionContext` interface (consumed by tool handlers)
- Unit tests for all components (mock shopify client in tool engine tests)

### Out of Scope
- Actual Shopify tool definitions (FEAT-010 through FEAT-014)
- Shopify GraphQL client implementation (FEAT-009)
- MCP `server.tool()` registration wiring (FEAT-015)
- Custom tool hot-reload / file watching
- Tool versioning or deprecation system
- GraphQL query introspection or validation

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/engine/types.ts` | ToolDefinition, ExecutionContext, ToolResult types |
| Create | `src/core/engine/tool-engine.ts` | Tool execution pipeline |
| Create | `src/core/engine/tool-engine.test.ts` | Tool engine tests |
| Create | `src/core/engine/index.ts` | Barrel export |
| Create | `src/core/registry/tool-registry.ts` | Tool registration + config filtering |
| Create | `src/core/registry/yaml-loader.ts` | YAML tool file parser |
| Create | `src/core/registry/tool-registry.test.ts` | Registry tests |
| Create | `src/core/registry/yaml-loader.test.ts` | YAML loader tests |
| Create | `src/core/registry/index.ts` | Barrel export |
| Create | `src/core/helpers/define-tool.ts` | defineTool() helper |
| Create | `src/core/helpers/define-tool.test.ts` | defineTool() tests |
| Create | `src/core/helpers/index.ts` | Barrel export |
| Delete | `src/core/engine/.gitkeep` | Replace with real files |
| Delete | `src/core/registry/.gitkeep` | Replace with real files |
| Delete | `src/core/helpers/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `ToolDefinition` interface exported from `@core/engine`
- [ ] `defineTool()` returns a frozen `ToolDefinition` object
- [ ] `defineTool()` rejects definition with neither `graphql` nor `handler`
- [ ] `defineTool()` accepts definition with `graphql` + `response` (no handler)
- [ ] `defineTool()` accepts definition with `handler` (no graphql)
- [ ] `ToolRegistry.register()` stores tool and retrieves by name
- [ ] `ToolRegistry.register()` throws on duplicate tool name
- [ ] `ToolRegistry.getByDomain()` returns only tools in the specified domain
- [ ] `ToolRegistry.filter()` excludes write tools when `read_only: true`
- [ ] `ToolRegistry.filter()` excludes tools in `disable` list
- [ ] `ToolRegistry.filter()` includes tools in `enable` list (overriding tier default)
- [ ] `ToolRegistry.filter()` enables tier 1 and tier 3 by default, disables tier 2
- [ ] Config precedence: `read_only` > `disable` > `enable` > tier defaults
- [ ] `ToolEngine.execute()` validates input against Zod schema
- [ ] `ToolEngine.execute()` returns friendly error for invalid input
- [ ] `ToolEngine.execute()` calls handler when tool has custom handler
- [ ] `ToolEngine.execute()` calls `ctx.shopify.query()` when tool has graphql
- [ ] `ToolEngine.execute()` applies response mapper when defined
- [ ] `ToolEngine.execute()` returns `ToolResult` with `_cost` and `_session` data
- [ ] YAML loader parses valid YAML tool file into `ToolDefinition`
- [ ] YAML loader rejects YAML missing required fields
- [ ] YAML loader converts YAML input types to Zod schemas
- [ ] All types exported from barrel indexes

---

## 7. Required Test Enforcement

### defineTool() Tests (`src/core/helpers/define-tool.test.ts`)
```
- returns frozen ToolDefinition for valid graphql tool
- returns frozen ToolDefinition for valid handler tool
- throws when neither graphql nor handler provided
- accepts tool with both graphql and handler (handler takes precedence)
- preserves all fields (name, domain, tier, scopes, input, description)
```

### ToolRegistry Tests (`src/core/registry/tool-registry.test.ts`)
```
- register + get roundtrip returns correct tool
- register throws on duplicate name
- getAll returns all registered tools
- getByDomain returns only matching domain tools
- filter with read_only=true excludes write_ scope tools
- filter with read_only=true keeps read-only tools
- filter excludes tools in disable list
- filter includes tier 2 tool when in enable list
- filter enables tier 1 by default
- filter disables tier 2 by default
- filter enables tier 3 by default
- precedence: read_only overrides enable list
- precedence: disable overrides tier default enable
- precedence: enable overrides tier default disable
```

### YAML Loader Tests (`src/core/registry/yaml-loader.test.ts`)
```
- loads valid YAML tool file into ToolDefinition
- sets tier to 3 for YAML tools
- converts string input type to z.string()
- converts number input type to z.number()
- converts boolean input type to z.boolean()
- converts enum input type to z.enum()
- applies min/max constraints to number inputs
- applies default values to inputs
- marks required inputs as non-optional
- rejects YAML missing name field
- rejects YAML missing graphql field
- loads multiple YAML files from directory
```

### ToolEngine Tests (`src/core/engine/tool-engine.test.ts`)
```
- execute calls handler with validated input and context
- execute calls shopify.query when tool has graphql (no handler)
- execute applies response mapper to graphql result
- execute returns ToolResult with data
- execute validates input — rejects missing required field
- execute validates input — rejects wrong type
- execute returns friendly error message on validation failure
- execute throws when tool not found in registry
- execute calls handler (not graphql) when both are defined
- execute wraps handler errors with tool context
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §3 (tool engine) thoroughly
2. Read design doc §2 (architecture overview) for system flow
3. Check Zod v4 API for `z.object()` dynamic construction from a record
4. Check `yaml` npm package API for parsing YAML tool files
5. Design the `ToolDefinition` type with TypeScript discriminated unions or overloads
6. Design the YAML input → Zod conversion mapping
7. **STOP — present type design and execution pipeline**

### Session 2: Implement Helpers + Registry
1. Write `src/core/engine/types.ts` with all types
2. Write `src/core/helpers/define-tool.ts`
3. Write `src/core/helpers/define-tool.test.ts` — run, verify pass
4. Write `src/core/registry/tool-registry.ts`
5. Write `src/core/registry/tool-registry.test.ts` — run, verify pass
6. **STOP**

### Session 3: Implement Engine + YAML
1. Write `src/core/engine/tool-engine.ts`
2. Write `src/core/engine/tool-engine.test.ts` — run, verify pass
3. Write `src/core/registry/yaml-loader.ts`
4. Write `src/core/registry/yaml-loader.test.ts` — run, verify pass
5. **STOP**

### Session 4: Wire + Finalize
1. Write all barrel exports (`index.ts` files)
2. Run full test suite — all pass
3. Run `pnpm lint && pnpm build` — clean
4. **Commit:** `feat(engine): add tool engine, registry, defineTool helper, and YAML loader`
5. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] `defineTool()` works for both graphql and handler tools
- [ ] Config filtering correctly applies precedence rules
- [ ] YAML tools parse and register correctly
- [ ] Tool engine validates input and executes pipeline
- [ ] All types exported from barrel indexes
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
