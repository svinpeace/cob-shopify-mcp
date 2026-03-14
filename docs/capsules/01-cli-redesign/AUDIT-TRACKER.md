# CLI Redesign Capsule Audit Tracker

**Audit Date:** 2026-03-14
**Auditor:** Claude Opus 4.6
**Codebase Commit:** bc4bc58 (HEAD of main)
**Tool Count Verified:** 49 tools (15 products, 12 orders, 9 customers, 7 inventory, 6 analytics)

---

## Summary

| Capsule | Verdict | Critical | Warning | Info |
|---------|---------|----------|---------|------|
| CLI-001 | EXECUTION-SAFE | 0 | 0 | 1 |
| CLI-002 | EXECUTION-SAFE | 0 | 1 | 1 |
| CLI-003 | EXECUTION-SAFE | 0 | 0 | 1 |
| CLI-004 | EXECUTION-SAFE | 0 | 1 | 0 |
| CLI-005 | EXECUTION-SAFE | 0 | 0 | 1 |
| CLI-006 | EXECUTION-SAFE | 0 | 1 | 0 |
| CLI-007 | EXECUTION-SAFE | 0 | 1 | 1 |
| CLI-008 | EXECUTION-SAFE | 0 | 0 | 0 |
| CLI-009 | EXECUTION-SAFE | 0 | 0 | 1 |
| CLI-INDEX | N/A | 0 | 1 | 0 |

**Overall Verdict: ALL CAPSULES EXECUTION-SAFE**

Zero critical issues found. All file paths exist. All line number references verified accurate (with minor off-by-one noted where applicable). All FEAT sections (0-11) present in every capsule.

---

## Global Findings

### G-1: Reserved Domains Inconsistency (WARNING)
- **CLI-007** defines `RESERVED_DOMAINS` as `["start", "connect", "config", "tools", "stores"]` (5 entries)
- **Design doc** line 21 lists only `["start", "connect", "config", "tools"]` (4 entries, no `stores`)
- `stores` IS an existing subcommand in `src/cli/index.ts:23`, so CLI-007's list is more correct
- **Resolution:** CLI-007's list of 5 is the right one; the design doc should be updated to add `stores`

### G-2: CLI-INDEX P0 Count Error (WARNING)
- Line 51 says "P0: 4 capsules" but then lists 5 capsule IDs: CLI-001, CLI-002, CLI-003, CLI-004, CLI-007
- **Resolution:** Should say "P0: 5 capsules"

---

## Per-Capsule Findings

### CLI-001: Action Name Derivation + Zod-to-Citty Converter

| ID | Severity | Finding |
|----|----------|---------|
| 001-I1 | INFO | Capsule says `package.json:32` for citty — actual is line 32. Correct. No issue. |

**File path verification:**
- `src/core/engine/types.ts` -- EXISTS, ToolDefinition at lines 8-18 CONFIRMED
- `src/cli/converter/` -- TO BE CREATED (correct, capsule says "Create")
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 25-36 -- CONFIRMED (action name derivation table)

**Line number verification:**
- `types.ts:8-18` for ToolDefinition: line 8 `export interface ToolDefinition {` through line 18 `}` -- EXACT MATCH
- `package.json:32` for citty: `"citty": "^0.2.1"` -- EXACT MATCH

**Structural completeness:** All 12 FEAT sections (0-11) present and filled. Section 8 uses 3-session model (acceptable for XS complexity).

**Verdict: EXECUTION-SAFE**

---

### CLI-002: Output Formatting System

| ID | Severity | Finding |
|----|----------|---------|
| 002-W1 | WARNING | Capsule says cost summary at `run.ts:141-145`. Actual: the `if` statement starts at line 141, but the `const stats` is at line 140. More accurately 140-145. Minor. |
| 002-I1 | INFO | Capsule references `SessionCostStats` from `src/core/observability/types.ts` without a line number. Type exists at lines 11-16. Consider adding line ref for precision. |

**File path verification:**
- `src/cli/utils.ts` -- EXISTS, `formatTable()` at lines 18-31 CONFIRMED
- `src/cli/commands/tools/run.ts` -- EXISTS
- `src/core/observability/types.ts` -- EXISTS, `SessionCostStats` at lines 11-16 CONFIRMED
- `src/cli/output/` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 127-191 -- CONFIRMED (Output System section)

**Line number verification:**
- `utils.ts:18-31` for formatTable: line 18 `export function formatTable(...)` through line 31 `}` -- EXACT MATCH
- `run.ts:136` for JSON.stringify: `const output = JSON.stringify(result.data, null, 2)` -- EXACT MATCH
- `run.ts:141-145` for cost: `if (stats.totalCallsMade > 0)` at 141, closing at 145 -- CONFIRMED (140 has `const stats`)

**Structural completeness:** All 12 FEAT sections present. 3-session model for S complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-003: toolToCommand() Core Converter

| ID | Severity | Finding |
|----|----------|---------|
| 003-I1 | INFO | Capsule references `ExecutionContext` interface from `src/core/engine/types.ts`. It exists at lines 20-28. No line number given in capsule — consider adding. |

**File path verification:**
- `src/cli/commands/tools/run.ts` -- EXISTS, all referenced line ranges verified
- `src/core/engine/types.ts` -- EXISTS, ToolDefinition + ExecutionContext CONFIRMED
- `src/cli/converter/tool-to-command.ts` -- TO BE CREATED (correct)
- `src/cli/converter/execution-context.ts` -- TO BE CREATED (correct)
- `src/cli/converter/global-flags.ts` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 193-239 -- CONFIRMED (Auto-Registration Architecture)

**Line number verification (run.ts):**
- Lines 19-49 (config/registry loading): 19 starts with `const { loadConfig }`, 49 closes the YAML block -- CONFIRMED
- Lines 71-100 (param parsing): 71 `let input...`, 100 closes the arg parsing loop -- CONFIRMED
- Lines 102-118 (infra boot): 102 `const storage`, 118 `})` closing client config -- CONFIRMED
- Lines 121-130 (context + engine): 121 `const ctx`, 130 `const engine = new ToolEngine(registry)` -- CONFIRMED
- Line 133 (execute): `const result = await engine.execute(args.name, input, ctx)` -- CONFIRMED
- Lines 136-137 (output): `const output = JSON.stringify...` and `process.stdout.write` -- CONFIRMED
- Lines 140-145 (cost): stats + consola.info -- CONFIRMED

**Structural completeness:** All 12 FEAT sections present. 3-session model for M complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-004: Domain Command Registration + CLI Entry Point

| ID | Severity | Finding |
|----|----------|---------|
| 004-W1 | WARNING | Capsule says `src/cli/index.ts:12-27` has 5 subcommands. Actual: lines 12-25 define the command, line 27 is `runMain(main)`. The subCommands block is lines 18-24. Not wrong per se, but the range 12-27 includes code beyond the subCommands definition. |

**File path verification:**
- `src/cli/index.ts` -- EXISTS, 5 subcommands (start, connect, config, tools, stores) at lines 18-24 CONFIRMED
- `src/server/get-all-tools.ts` -- EXISTS, `getAllTools()` at lines 7-19, file is 33 lines CONFIRMED
- `src/core/registry/yaml-loader.ts` -- EXISTS, `loadYamlTools()` at line 113 CONFIRMED
- `src/cli/domain-commands.ts` -- TO BE CREATED (correct)
- `src/cli/domain-descriptions.ts` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 12-125 -- CONFIRMED (Command Structure + Domain Mapping)

**Line number verification:**
- `index.ts:12-27`: line 12 `const main = defineCommand({`, line 27 `runMain(main)` -- CONFIRMED

**Structural completeness:** All 12 FEAT sections present. 3-session model for M complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-005: Schema Introspection (`--describe`)

| ID | Severity | Finding |
|----|----------|---------|
| 005-I1 | INFO | Capsule says to add `outputFields` to `ToolDefinition` at `types.ts:8-18`. This is accurate as the interface spans those lines. The modification is backward-compatible (optional field). |

**File path verification:**
- `src/core/engine/types.ts:8-18` -- EXISTS, ToolDefinition CONFIRMED
- `src/cli/commands/tools/info.ts` -- EXISTS, shows basic tool details CONFIRMED
- `src/cli/converter/describe.ts` -- TO BE CREATED (correct)
- `src/shopify/tools/products/list-products.tool.ts` -- EXISTS
- `src/shopify/tools/products/get-product.tool.ts` -- EXISTS
- `src/shopify/tools/orders/list-orders.tool.ts` -- EXISTS
- `src/shopify/tools/orders/get-order.tool.ts` -- EXISTS
- `src/shopify/tools/customers/list-customers.tool.ts` -- EXISTS
- `src/shopify/tools/customers/get-customer.tool.ts` -- EXISTS
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 252-277 -- CONFIRMED (Schema Introspection section)

**Structural completeness:** All 12 FEAT sections present. 2-session model for S complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-006: Mutation Safety (`--dry-run` + Confirmation)

| ID | Severity | Finding |
|----|----------|---------|
| 006-W1 | WARNING | Capsule says `ToolDefinition.scopes` is at `types.ts` line 14. Actual: `scopes: string[]` is at line 13. Off by 1. |

**File path verification:**
- `src/core/engine/types.ts` -- EXISTS
- `src/cli/converter/tool-to-command.ts` -- TO BE CREATED by CLI-003 (dependency correct)
- `src/cli/safety/mutation-guard.ts` -- TO BE CREATED (correct)
- `src/cli/safety/index.ts` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 279-309 -- CONFIRMED (Mutation Safety section)

**Line number verification:**
- `types.ts` line 14 for scopes: ACTUAL is line 13 (`scopes: string[]`). Line 14 is `input: Record<string, ZodType>`.

**Structural completeness:** All 12 FEAT sections present. 2-session model for S complexity is appropriate.

**Verdict: EXECUTION-SAFE** (off-by-one is cosmetic, implementer will find the right line)

---

### CLI-007: Collision Handling in ToolRegistry

| ID | Severity | Finding |
|----|----------|---------|
| 007-W1 | WARNING | Reserved domains list includes `stores` but the design doc (line 21) only lists `start, connect, config, tools`. Capsule's list is more correct since `stores` IS a subcommand. Design doc should be updated. |
| 007-I1 | INFO | Capsule says `register()` at lines 7-11. Actual: lines 7-12 (closing brace is line 12). The method body is 7-11 but the full method signature + body is 7-12. |

**File path verification:**
- `src/core/registry/tool-registry.ts` -- EXISTS, `register()` at lines 7-12 CONFIRMED
- `src/core/registry/tool-registry.test.ts` -- EXISTS (capsule says "if test file exists, otherwise create" -- it exists)
- `src/cli/commands/tools/run.ts:38-49` -- EXISTS, registration order (built-in first, YAML second) CONFIRMED
- `src/core/registry/yaml-loader.ts:91` -- `tier: 3,` CONFIRMED at line 91
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 241-250 -- CONFIRMED (Collision Handling section)

**Line number verification:**
- `tool-registry.ts:7-11`: method starts at 7, `this.tools.set` at 11, closing `}` at 12 -- CLOSE (should be 7-12)
- `run.ts:38-49`: line 38 `const allTools = getAllTools()`, line 49 `}` closing YAML block -- CONFIRMED
- `yaml-loader.ts:91`: `tier: 3,` -- EXACT MATCH

**Structural completeness:** All 12 FEAT sections present. 2-session model for XS complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-008: Deprecation Wrappers for tools run/list/info

No critical or warning findings. All file paths verified:

**File path verification:**
- `src/cli/commands/tools/run.ts` -- EXISTS
- `src/cli/commands/tools/list.ts` -- EXISTS
- `src/cli/commands/tools/info.ts` -- EXISTS
- `src/cli/deprecation.ts` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 311-328 -- CONFIRMED (Deprecation Plan section)

**Structural completeness:** All 12 FEAT sections present. 1-session model for XS complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

### CLI-009: Build-Time Command Generation

| ID | Severity | Finding |
|----|----------|---------|
| 009-I1 | INFO | Capsule references `tsup.config.ts` entry points. Actual file at root has `entry: ["src/index.ts", "src/cli/index.ts"]` on line 4 -- CONFIRMED. |

**File path verification:**
- `tsup.config.ts` -- EXISTS, entry points CONFIRMED at line 4
- `src/server/get-all-tools.ts` -- EXISTS
- `scripts/generate-cli-commands.ts` -- TO BE CREATED (correct)
- `src/cli/generated/` -- TO BE CREATED (correct)
- `docs/plans/2026-03-14-cli-redesign-design.md` lines 210-222 -- CONFIRMED (Hybrid Registration section)

**Structural completeness:** All 12 FEAT sections present. 3-session model for M complexity is appropriate.

**Verdict: EXECUTION-SAFE**

---

## Verification Evidence

### ToolDefinition interface (src/core/engine/types.ts:8-18)
```typescript
 8: export interface ToolDefinition {
 9:   name: string;
10:   domain: string;
11:   tier: 1 | 2 | 3;
12:   description: string;
13:   scopes: string[];
14:   input: Record<string, ZodType>;
15:   graphql?: string;
16:   handler?: (input: any, ctx: ExecutionContext) => Promise<any>;
17:   response?: (data: any) => any;
18: }
```

### ToolRegistry.register() (src/core/registry/tool-registry.ts:7-12)
```typescript
 7:   register(tool: ToolDefinition): void {
 8:     if (this.tools.has(tool.name)) {
 9:       throw new Error(`Tool "${tool.name}" is already registered`);
10:     }
11:     this.tools.set(tool.name, tool);
12:   }
```

### CLI entry point subcommands (src/cli/index.ts:18-24)
```typescript
18:   subCommands: {
19:     start: () => import("./commands/start.js").then((m) => m.default),
20:     connect: () => import("./commands/connect.js").then((m) => m.default),
21:     config: () => import("./commands/config/index.js").then((m) => m.default),
22:     tools: () => import("./commands/tools/index.js").then((m) => m.default),
23:     stores: () => import("./commands/stores/index.js").then((m) => m.default),
24:   },
```

### formatTable (src/cli/utils.ts:18-31)
```typescript
18: export function formatTable(headers: string[], rows: string[][]): string {
...
31: }
```

### SessionCostStats (src/core/observability/types.ts:11-16)
```typescript
11: export interface SessionCostStats {
12:   totalCostConsumed: number;
13:   totalCallsMade: number;
14:   budgetRemaining: number;
15:   averageCostPerCall: number;
16: }
```

### CostTracker class (src/core/observability/cost-tracker.ts:3-29)
```typescript
 3: export class CostTracker {
...
14:   getSessionStats(): SessionCostStats {
...
29: }
```

### YAML loader tier: 3 (src/core/registry/yaml-loader.ts:91)
```typescript
91:     tier: 3,
```

### Tool count by domain (49 total)
- products: 15
- orders: 12
- customers: 9
- inventory: 7
- analytics: 6
