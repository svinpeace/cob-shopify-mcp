# FEAT-015: MCP Server Wiring — Resources, Prompts & Server Bootstrap

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Server Integration |
| **Domain** | Server |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-002, FEAT-003, FEAT-004, FEAT-005, FEAT-006, FEAT-007, FEAT-008, FEAT-009, FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014 |
| **Blocks** | FEAT-016 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can start the MCP server and it registers all tools, resources, and prompts automatically
- As a developer, the server starts over stdio by default or HTTP via config
- As a developer, every tool response includes `_cost` and `_session` metadata
- As a developer, I can call any registered tool via any MCP client (Claude Desktop, Cursor, etc.)

---

## 1. Executive Context

**Product Intent:** Wire everything together. This capsule creates the MCP server instance, registers all tools from the registry with `McpServer.tool()`, registers resources with `McpServer.resource()`, registers prompts with `McpServer.prompt()`, initializes all core services (config, auth, storage, observability), creates the Shopify client, and starts the transport. This is the integration layer that turns all the individual components into a working server.

**System Position:** `src/server/` and `src/shopify/resources/`, `src/shopify/prompts/`. The server module imports from both `@core/*` and `@shopify/*` to wire them together. It also defines the Shopify-specific MCP resources (shop info, locations, policies, currencies) and prompt templates.

---

## 2. Feature Specification

### What Exists Today
All core modules (config, auth, storage, observability, engine, registry, transport), Shopify client, and all 49 tools across 5 domains. Empty `src/server/`, `src/shopify/resources/`, `src/shopify/prompts/` directories.

### What Must Be Built

1. **Shopify Resources** (`src/shopify/resources/`)
   - `shop-info.resource.ts` — `shopify://shop/{domain}/info`: Shop name, email, plan, timezone, currency
   - `shop-locations.resource.ts` — `shopify://shop/{domain}/locations`: All fulfillment locations
   - `shop-policies.resource.ts` — `shopify://shop/{domain}/policies`: Refund, privacy, TOS policies
   - `shop-currencies.resource.ts` — `shopify://shop/{domain}/currencies`: Enabled currencies
   - Each with co-located `.graphql` file
   - Barrel export at `src/shopify/resources/index.ts`

2. **Shopify Prompts** (`src/shopify/prompts/`)
   - `store-health-check.prompt.ts` — Prompt template for comprehensive store health analysis
   - `daily-sales-report.prompt.ts` — Prompt template for daily sales overview
   - `inventory-risk-analysis.prompt.ts` — Prompt template for inventory risk assessment
   - `customer-support-summary.prompt.ts` — Prompt template for customer support context
   - Barrel export at `src/shopify/prompts/index.ts`

3. **Tool Registration Bridge** (`src/server/register-tools.ts`)
   - Imports all tools from `@shopify/tools` barrel
   - Registers each tool with `ToolRegistry`
   - Loads YAML custom tools from `config.tools.custom_paths`
   - Applies config filter (tiers, enable/disable, read_only)
   - For each enabled tool, calls `McpServer.tool()` with:
     - Tool name and description
     - Zod input schema (converted from tool's input record)
     - Handler that calls `ToolEngine.execute()`

4. **Resource Registration Bridge** (`src/server/register-resources.ts`)
   - Imports all resources from `@shopify/resources`
   - For each resource, calls `McpServer.resource()` with URI template + handler

5. **Prompt Registration Bridge** (`src/server/register-prompts.ts`)
   - Imports all prompts from `@shopify/prompts`
   - For each prompt, calls `McpServer.prompt()` with name, args, handler

6. **Server Bootstrap** (`src/server/bootstrap.ts`)
   - `bootstrap()` async function — the main entry point
   - Initialization sequence:
     1. Load config (`loadConfig()`)
     2. Initialize logger (`createLogger('server')`)
     3. Initialize storage (`createStorage(config)`)
     4. Initialize auth (`createAuthProvider(config, storage)`)
     5. Create Shopify client (`createShopifyClient(...)`)
     6. Create CostTracker
     7. Create ToolEngine, ToolRegistry
     8. Create ResourceEngine, PromptEngine
     9. Register tools, resources, prompts
     10. Create McpServer (`new McpServer(...)`)
     11. Wire registered tools/resources/prompts to McpServer
     12. Create transport (`createTransport(config.transport)`)
     13. Start transport (`transport.start(server)`)
     14. Log startup complete
   - Graceful shutdown handler (SIGTERM, SIGINT)

7. **Main Entry Point Update** (`src/index.ts`)
   - Import and call `bootstrap()` when run directly
   - Export key types for library consumers

8. **Shopify Tools Barrel** (`src/shopify/tools/index.ts`)
   - Aggregate barrel that re-exports all domain tool barrels
   ```typescript
   export * as products from './products'
   export * as orders from './orders'
   export * as customers from './customers'
   export * as inventory from './inventory'
   export * as analytics from './analytics'
   ```

### Risk Assessment
- **Initialization order:** Services must be initialized in dependency order. Config first, then storage, then auth, then client.
- **Tool → MCP SDK bridge:** The `McpServer.tool()` method expects a specific handler signature. Must adapt `ToolEngine.execute()` to match.
- **Error propagation:** Tool execution errors must be caught and returned as MCP error responses, not crash the server.
- **Startup time:** Registering 49+ tools should be fast (milliseconds, not seconds).

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §6 | MCP server setup, resource/prompt definitions |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §2 | Architecture overview, system flow |

---

## 4. Scope Guardrails

### In Scope
- 4 Shopify resources with GraphQL
- 4 Shopify prompts
- Tool/resource/prompt registration bridges
- Server bootstrap with full initialization sequence
- McpServer tool/resource/prompt wiring
- Graceful shutdown
- Entry point update
- Shopify tools aggregate barrel
- Integration tests (server starts, tool callable)

### Out of Scope
- CLI commands (FEAT-016)
- Multi-store switching within a session
- Hot-reload of tools/config
- Server clustering / multiple workers
- Authentication on HTTP transport

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/resources/shop-info.resource.ts` | Shop info resource |
| Create | `src/shopify/resources/shop-info.graphql` | GraphQL query |
| Create | `src/shopify/resources/shop-locations.resource.ts` | Locations resource |
| Create | `src/shopify/resources/shop-locations.graphql` | GraphQL query |
| Create | `src/shopify/resources/shop-policies.resource.ts` | Policies resource |
| Create | `src/shopify/resources/shop-policies.graphql` | GraphQL query |
| Create | `src/shopify/resources/shop-currencies.resource.ts` | Currencies resource |
| Create | `src/shopify/resources/shop-currencies.graphql` | GraphQL query |
| Create | `src/shopify/resources/index.ts` | Barrel export |
| Create | `src/shopify/prompts/store-health-check.prompt.ts` | Health check prompt |
| Create | `src/shopify/prompts/daily-sales-report.prompt.ts` | Sales report prompt |
| Create | `src/shopify/prompts/inventory-risk-analysis.prompt.ts` | Inventory risk prompt |
| Create | `src/shopify/prompts/customer-support-summary.prompt.ts` | Support summary prompt |
| Create | `src/shopify/prompts/index.ts` | Barrel export |
| Create | `src/shopify/tools/index.ts` | Aggregate tools barrel |
| Create | `src/server/register-tools.ts` | Tool → McpServer bridge |
| Create | `src/server/register-resources.ts` | Resource → McpServer bridge |
| Create | `src/server/register-prompts.ts` | Prompt → McpServer bridge |
| Create | `src/server/bootstrap.ts` | Server initialization |
| Create | `src/server/bootstrap.test.ts` | Bootstrap tests |
| Create | `src/server/index.ts` | Barrel export |
| Modify | `src/index.ts` | Main entry point |
| Delete | `src/server/.gitkeep` | Replace with real files |
| Delete | `src/shopify/resources/.gitkeep` | Replace with real files |
| Delete | `src/shopify/prompts/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] 4 Shopify resources defined with `defineResource()` and co-located GraphQL
- [ ] 4 Shopify prompts defined with `definePrompt()`
- [ ] All 49 tools registered with McpServer via tool bridge
- [ ] All 4 resources registered with McpServer via resource bridge
- [ ] All 4 prompts registered with McpServer via prompt bridge
- [ ] Config filter applied during tool registration (tiers, enable/disable, read_only)
- [ ] YAML custom tools loaded from `config.tools.custom_paths`
- [ ] Server bootstrap initializes all services in correct order
- [ ] Server starts on stdio transport by default
- [ ] Server starts on HTTP transport when configured
- [ ] Tool execution returns `_cost` and `_session` metadata
- [ ] Tool execution errors returned as MCP error responses (not server crash)
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] `src/index.ts` exports key types and runs bootstrap when executed directly

---

## 7. Required Test Enforcement

### Bootstrap Tests (`src/server/bootstrap.test.ts`)
```
- bootstrap initializes config
- bootstrap initializes storage
- bootstrap initializes auth provider
- bootstrap creates Shopify client
- bootstrap registers tools with McpServer
- bootstrap registers resources with McpServer
- bootstrap registers prompts with McpServer
- bootstrap starts transport
- shutdown handler closes storage and transport
```

### Registration Bridge Tests
```
- register-tools: all tool domains are imported and registered
- register-tools: config filter excludes disabled tools
- register-tools: McpServer.tool() called for each enabled tool
- register-resources: all resources registered with correct URI
- register-prompts: all prompts registered with correct name
```

### Resource Tests (1 per resource, mock shopify.query)
```
- shop-info: returns shop name, email, plan
- shop-locations: returns list of locations
- shop-policies: returns store policies
- shop-currencies: returns enabled currencies
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read MCP SDK `McpServer.tool()`, `McpServer.resource()`, `McpServer.prompt()` APIs
2. Read MCP SDK `McpServer.connect()` for transport wiring
3. Design the registration bridge pattern (tool def → McpServer.tool() call)
4. Design the bootstrap initialization sequence
5. **STOP — present design**

### Session 2: Implement Resources + Prompts
1. Write 4 Shopify resources with GraphQL
2. Write 4 Shopify prompts
3. Write barrel exports
4. Write resource + prompt tests
5. **STOP**

### Session 3: Implement Server Wiring
1. Write `register-tools.ts`
2. Write `register-resources.ts`
3. Write `register-prompts.ts`
4. Write `bootstrap.ts`
5. Write `src/shopify/tools/index.ts` aggregate barrel
6. **STOP**

### Session 4: Finalize
1. Write `bootstrap.test.ts`
2. Update `src/index.ts` entry point
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(server): wire MCP server with tools, resources, prompts, and bootstrap`
6. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Server boots and registers all 49 tools + 4 resources + 4 prompts
- [ ] Tool execution returns cost metadata
- [ ] Graceful shutdown works
- [ ] Entry point works for direct execution
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
