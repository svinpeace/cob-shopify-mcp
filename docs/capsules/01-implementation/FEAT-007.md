# FEAT-007: Core MCP Primitives (Resource & Prompt Engines)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P1 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Engine |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-001, FEAT-002 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can define MCP resources using `defineResource()` with a URI template and handler
- As a developer, I can define MCP prompts using `definePrompt()` with arguments and a message template
- As a developer, resources and prompts are registered and served by the MCP server alongside tools

---

## 1. Executive Context

**Product Intent:** MCP defines three primitive types: Tools, Resources, and Prompts. FEAT-006 handles tools. This capsule handles the remaining two. Resources expose read-only data (shop info, locations, policies). Prompts expose reusable prompt templates (product analysis, order investigation). Both are registered similarly to tools but with different MCP SDK methods.

**System Position:** `src/core/engine/` (ResourceEngine, PromptEngine) and `src/core/helpers/` (defineResource, definePrompt). These engines are consumed by the MCP server wiring (FEAT-015) to call `server.resource()` and `server.prompt()`.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty directories. FEAT-002 config. FEAT-006 tool engine establishes the pattern for engines + helpers.

### What Must Be Built

1. **Resource Types** (`src/core/engine/resource-types.ts`)
   ```typescript
   interface ResourceDefinition {
     uri: string                     // URI template e.g. "shopify://shop/{domain}/info"
     name: string                    // human-readable name
     description: string             // what this resource provides
     mimeType: string                // "application/json"
     handler: (params: Record<string, string>, ctx: ExecutionContext) => Promise<ResourceContent>
   }

   interface ResourceContent {
     uri: string
     mimeType: string
     text: string                    // JSON stringified content
   }
   ```

2. **defineResource() Helper** (`src/core/helpers/define-resource.ts`)
   - Accepts a `ResourceDefinition` and returns it frozen
   - Validates that `uri`, `name`, `handler` are present
   ```typescript
   export function defineResource(def: ResourceDefinitionInput): ResourceDefinition
   ```

3. **Resource Engine** (`src/core/engine/resource-engine.ts`)
   - `ResourceEngine` class
   - `register(resource: ResourceDefinition)` — adds resource
   - `list(): ResourceDefinition[]` — all registered resources
   - `read(uri: string, ctx: ExecutionContext): Promise<ResourceContent>` — resolves URI, calls handler
   - URI template matching: extracts params from URI pattern (e.g., `{domain}` from `shopify://shop/{domain}/info`)

4. **Prompt Types** (`src/core/engine/prompt-types.ts`)
   ```typescript
   interface PromptDefinition {
     name: string                    // prompt identifier
     description: string             // what this prompt helps with
     arguments: PromptArgument[]     // arguments the prompt accepts
     handler: (args: Record<string, string>, ctx: ExecutionContext) => Promise<PromptMessage[]>
   }

   interface PromptArgument {
     name: string
     description: string
     required: boolean
   }

   interface PromptMessage {
     role: 'user' | 'assistant'
     content: { type: 'text'; text: string }
   }
   ```

5. **definePrompt() Helper** (`src/core/helpers/define-prompt.ts`)
   - Accepts a `PromptDefinition` and returns it frozen
   - Validates that `name`, `description`, `handler` are present
   ```typescript
   export function definePrompt(def: PromptDefinitionInput): PromptDefinition
   ```

6. **Prompt Engine** (`src/core/engine/prompt-engine.ts`)
   - `PromptEngine` class
   - `register(prompt: PromptDefinition)` — adds prompt
   - `list(): PromptDefinition[]` — all registered prompts
   - `get(name: string, args: Record<string, string>, ctx: ExecutionContext): Promise<PromptMessage[]>` — validates args, calls handler
   - Validates required arguments are present

7. **Barrel Updates** (`src/core/helpers/index.ts`, `src/core/engine/index.ts`)

### User Workflow — Defining a Resource
```typescript
// shopify/resources/shop-info.resource.ts
import { defineResource } from '@core/helpers/define-resource'

export default defineResource({
  uri: 'shopify://shop/{domain}/info',
  name: 'Shop Info',
  description: 'Basic shop information including name, plan, and contact details',
  mimeType: 'application/json',
  handler: async (params, ctx) => {
    const data = await ctx.shopify.query(shopInfoQuery, { domain: params.domain })
    return {
      uri: `shopify://shop/${params.domain}/info`,
      mimeType: 'application/json',
      text: JSON.stringify(data.shop),
    }
  },
})
```

### User Workflow — Defining a Prompt
```typescript
// shopify/prompts/product-analysis.prompt.ts
import { definePrompt } from '@core/helpers/define-prompt'

export default definePrompt({
  name: 'analyze_product',
  description: 'Analyze a product listing for SEO, pricing, and inventory optimization',
  arguments: [
    { name: 'product_id', description: 'Product GID', required: true },
    { name: 'focus', description: 'Analysis focus: seo, pricing, inventory, or all', required: false },
  ],
  handler: async (args, ctx) => {
    return [{
      role: 'user',
      content: {
        type: 'text',
        text: `Analyze product ${args.product_id} with focus on ${args.focus || 'all'}. Use get_product and list_product_variants tools to gather data, then provide actionable recommendations.`,
      },
    }]
  },
})
```

### Risk Assessment
- **URI template parsing:** Must handle variable extraction correctly. Use simple regex, not a full RFC 6570 implementation.
- **Resource vs Tool confusion:** Resources are read-only data fetches (like GET endpoints). Tools are actions. Keep the distinction clear.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §2 | Architecture overview (Resource Engine, Prompt Engine) |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §6 | MCP server capabilities (resources, prompts) |

---

## 4. Scope Guardrails

### In Scope
- ResourceDefinition and PromptDefinition types
- `defineResource()` and `definePrompt()` helpers
- ResourceEngine with URI template matching
- PromptEngine with argument validation
- Unit tests for all components

### Out of Scope
- Actual Shopify resource definitions (FEAT-015)
- Actual Shopify prompt definitions (FEAT-015)
- Resource subscriptions (MCP spec optional feature)
- Prompt sampling (MCP spec optional feature)
- Resource caching (handled by Shopify client layer)

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/engine/resource-types.ts` | Resource types |
| Create | `src/core/engine/resource-engine.ts` | Resource execution engine |
| Create | `src/core/engine/resource-engine.test.ts` | Resource engine tests |
| Create | `src/core/engine/prompt-types.ts` | Prompt types |
| Create | `src/core/engine/prompt-engine.ts` | Prompt execution engine |
| Create | `src/core/engine/prompt-engine.test.ts` | Prompt engine tests |
| Create | `src/core/helpers/define-resource.ts` | defineResource() helper |
| Create | `src/core/helpers/define-resource.test.ts` | defineResource() tests |
| Create | `src/core/helpers/define-prompt.ts` | definePrompt() helper |
| Create | `src/core/helpers/define-prompt.test.ts` | definePrompt() tests |
| Modify | `src/core/helpers/index.ts` | Add resource + prompt exports |
| Modify | `src/core/engine/index.ts` | Add resource + prompt exports |

---

## 6. Acceptance Criteria

- [ ] `ResourceDefinition` interface exported from `@core/engine`
- [ ] `defineResource()` returns frozen ResourceDefinition
- [ ] `defineResource()` rejects definition missing handler
- [ ] `ResourceEngine.register()` stores resource
- [ ] `ResourceEngine.list()` returns all registered resources
- [ ] `ResourceEngine.read()` extracts URI params and calls handler
- [ ] `ResourceEngine.read()` throws for unmatched URI
- [ ] `PromptDefinition` interface exported from `@core/engine`
- [ ] `definePrompt()` returns frozen PromptDefinition
- [ ] `definePrompt()` rejects definition missing handler
- [ ] `PromptEngine.register()` stores prompt
- [ ] `PromptEngine.list()` returns all registered prompts
- [ ] `PromptEngine.get()` calls handler with validated args
- [ ] `PromptEngine.get()` throws when required argument is missing
- [ ] All types exported from barrel indexes

---

## 7. Required Test Enforcement

### defineResource() Tests (`src/core/helpers/define-resource.test.ts`)
```
- returns frozen ResourceDefinition for valid input
- throws when handler is missing
- preserves all fields (uri, name, description, mimeType)
```

### definePrompt() Tests (`src/core/helpers/define-prompt.test.ts`)
```
- returns frozen PromptDefinition for valid input
- throws when handler is missing
- preserves arguments array
```

### ResourceEngine Tests (`src/core/engine/resource-engine.test.ts`)
```
- register + list roundtrip returns resources
- read extracts URI params correctly ({domain} from shopify://shop/test.myshopify.com/info)
- read calls handler with extracted params
- read throws for URI that matches no registered resource
- read returns ResourceContent from handler
```

### PromptEngine Tests (`src/core/engine/prompt-engine.test.ts`)
```
- register + list roundtrip returns prompts
- get calls handler with provided args
- get throws when required argument is missing
- get succeeds when optional argument is missing
- get returns PromptMessage array from handler
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §2 and §6 for resource and prompt engine specs
2. Read MCP SDK source for `server.resource()` and `server.prompt()` method signatures
3. Design URI template matching regex
4. Design the types for resources and prompts
5. **STOP — present type designs**

### Session 2: Implement Resources
1. Write `resource-types.ts`
2. Write `define-resource.ts`
3. Write `define-resource.test.ts` — run, verify pass
4. Write `resource-engine.ts`
5. Write `resource-engine.test.ts` — run, verify pass
6. **STOP**

### Session 3: Implement Prompts + Finalize
1. Write `prompt-types.ts`
2. Write `define-prompt.ts`
3. Write `define-prompt.test.ts` — run, verify pass
4. Write `prompt-engine.ts`
5. Write `prompt-engine.test.ts` — run, verify pass
6. Update barrel exports
7. Run full test suite — all pass
8. Run `pnpm lint && pnpm build` — clean
9. **Commit:** `feat(engine): add resource and prompt engines with define helpers`
10. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Resource URI template matching works correctly
- [ ] Prompt argument validation works correctly
- [ ] All types exported from barrel indexes
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
