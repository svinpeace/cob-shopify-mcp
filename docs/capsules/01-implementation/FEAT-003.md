# FEAT-003: Core Observability & Cost Tracking

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Observability |
| **Complexity** | S |
| **Estimated Sessions** | 2 |
| **Depends On** | FEAT-002 |
| **Blocks** | FEAT-004, FEAT-009 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I see structured JSON logs on stderr (not stdout, which is reserved for MCP stdio)
- As a developer, I can see every tool invocation in an audit trail
- As a developer, I see Shopify API cost data (requested, actual, remaining) in every tool response and in logs
- As a developer, I can see cumulative session cost (total consumed, total calls, budget remaining)

---

## 1. Executive Context

**Product Intent:** Provide comprehensive observability including structured logging, audit trail, and Shopify API cost tracking. Cost transparency is critical because Shopify uses a cost-based throttle (not request-count) and devs need to see their point consumption per call and cumulatively.

**System Position:** `src/core/observability/`. Consumed by the tool engine (audit every invocation), the Shopify client (cost tracking), and all modules (structured logging). The cost tracker is updated by the Shopify client after each API call and its data is appended to every tool response.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty `src/core/observability/` directory. FEAT-002 config system providing `observability.log_level`, `observability.audit_log`, `observability.metrics`.

### What Must Be Built

1. **Logger** (`src/core/observability/logger.ts`)
   - pino instance writing to stderr (stdout is MCP protocol)
   - Log level from config (`debug | info | warn | error`)
   - Structured JSON output with timestamp
   - Child logger support (per-module context)
   - `createLogger(module: string)` factory

2. **Audit Trail** (`src/core/observability/audit.ts`)
   - `AuditLogger` class
   - Logs every tool invocation: tool name, input params, store domain, duration_ms, status (success/error), cost data
   - Output to `~/.cob-shopify-mcp/audit.log` (JSON lines) or SQLite (when storage backend is sqlite)
   - Configurable: `observability.audit_log: true/false`
   - File rotation: not in scope (use external log rotation)

3. **Cost Tracker** (`src/core/observability/cost-tracker.ts`)
   - `CostTracker` class — tracks per-session cumulative Shopify API costs
   - `recordCall(costData)` — called by Shopify client after each GraphQL response
   - `getSessionStats()` — returns `{ totalCostConsumed, totalCallsMade, budgetRemaining, averageCostPerCall }`
   - `getCostSummary(callCost)` — returns per-call cost + session stats for embedding in tool response
   - Reads throttle status from Shopify response `extensions.cost`
   - Thread-safe (single-threaded Node.js, but must handle concurrent async calls)

4. **Types** (`src/core/observability/types.ts`)
   - `ShopifyCostData` — `{ requestedQueryCost, actualQueryCost, throttleStatus: { maximumAvailable, currentlyAvailable, restoreRate } }`
   - `SessionCostStats` — `{ totalCostConsumed, totalCallsMade, budgetRemaining, averageCostPerCall }`
   - `AuditEntry` — tool invocation record
   - `CostSummary` — per-call + session combined (embedded in tool response `_cost` and `_session`)

5. **Barrel Export** (`src/core/observability/index.ts`)

### User Workflow — Cost in Tool Response
Every tool response includes:
```json
{
  "products": [...],
  "_cost": {
    "requestedQueryCost": 101,
    "actualQueryCost": 46,
    "throttleStatus": {
      "maximumAvailable": 1000,
      "currentlyAvailable": 954,
      "restoreRate": 50
    }
  },
  "_session": {
    "totalCostConsumed": 312,
    "totalCallsMade": 7,
    "budgetRemaining": 688,
    "averageCostPerCall": 44.6
  }
}
```

### Risk Assessment
- **stdout vs stderr:** pino MUST write to stderr. Writing to stdout corrupts MCP stdio protocol. Use `pino({ transport: { target: 'pino/file', options: { destination: 2 } } })` or `pino(pino.destination(2))`.
- **Audit log file:** Must handle missing directory gracefully (create `~/.cob-shopify-mcp/` if not exists).
- **Cost tracker accuracy:** `budgetRemaining` comes from Shopify's `currentlyAvailable` in the latest response, not our own calculation. We track cumulative consumed cost ourselves.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §8 | Observability design |
| 2 | Shopify API Rate Limits (https://shopify.dev/docs/api/usage/limits) | Cost fields, throttle status structure |

---

## 4. Scope Guardrails

### In Scope
- pino logger to stderr with structured JSON
- Audit trail to JSON lines file
- CostTracker class tracking per-session cumulative costs
- CostSummary type for embedding in tool responses
- All types exported
- Full unit tests

### Out of Scope
- Metrics (Prometheus/OpenTelemetry export) — future enhancement
- Audit trail to SQLite — will be added when SQLite storage is built (FEAT-004), but the interface should support it
- Log rotation
- Dashboard/visualization

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/observability/types.ts` | Cost, audit, session types |
| Create | `src/core/observability/logger.ts` | pino logger factory |
| Create | `src/core/observability/audit.ts` | Audit trail logger |
| Create | `src/core/observability/cost-tracker.ts` | Session cost tracker |
| Create | `src/core/observability/index.ts` | Barrel export |
| Create | `src/core/observability/logger.test.ts` | Logger tests |
| Create | `src/core/observability/cost-tracker.test.ts` | Cost tracker tests |
| Create | `src/core/observability/audit.test.ts` | Audit trail tests |
| Modify | `package.json` | Add `pino` dependency |
| Delete | `src/core/observability/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] Logger writes to stderr (fd 2), never stdout
- [ ] Logger respects `log_level` from config
- [ ] `createLogger('module-name')` returns child logger with module context
- [ ] Audit log writes JSON lines to `~/.cob-shopify-mcp/audit.log`
- [ ] Audit log creates directory if missing
- [ ] Audit log can be disabled via config `observability.audit_log: false`
- [ ] Audit entry contains: `tool`, `input`, `store`, `ts`, `duration_ms`, `status`, `cost`
- [ ] `CostTracker.recordCall()` updates cumulative stats
- [ ] `CostTracker.getSessionStats()` returns accurate `totalCostConsumed`, `totalCallsMade`, `budgetRemaining`, `averageCostPerCall`
- [ ] `CostTracker.getCostSummary(callCost)` returns combined per-call + session data
- [ ] `budgetRemaining` uses Shopify's `currentlyAvailable` from latest response
- [ ] All types exported from `@core/observability`

---

## 7. Required Test Enforcement

### Logger Tests (`src/core/observability/logger.test.ts`)
```
- createLogger returns pino instance
- logger writes to stderr (capture fd 2 output)
- logger respects log level (debug messages hidden at info level)
- child logger includes module context in output
```

### Cost Tracker Tests (`src/core/observability/cost-tracker.test.ts`)
```
- recordCall updates totalCostConsumed with actualQueryCost
- recordCall increments totalCallsMade
- getSessionStats returns correct averageCostPerCall
- budgetRemaining uses latest throttleStatus.currentlyAvailable
- getCostSummary combines per-call cost + session stats
- fresh tracker has zero stats
- multiple calls accumulate correctly
```

### Audit Tests (`src/core/observability/audit.test.ts`)
```
- writes JSON line to audit file
- creates directory if missing
- audit entry contains required fields (tool, input, ts, duration_ms, status)
- audit disabled when config is false
- audit entry includes cost data when provided
```

---

## 8. 4-Session Execution Model

### Session 1: Research + Implement
1. Read design doc §8 (observability)
2. Check pino API for stderr destination: `pino(pino.destination(2))`
3. Check pino child logger API
4. Write `types.ts` with all type definitions
5. Write `logger.ts` with createLogger factory
6. Write `logger.test.ts` — run, verify pass
7. **STOP**

### Session 2: Implement
1. Write `cost-tracker.ts` with CostTracker class
2. Write `cost-tracker.test.ts` — run, verify pass
3. Write `audit.ts` with AuditLogger class
4. Write `audit.test.ts` — run, verify pass (use temp dir for audit file)
5. Write `index.ts` barrel export
6. Run `pnpm test` — all pass
7. Run `pnpm lint && pnpm build` — clean
8. **Commit:** `feat(observability): add pino logger, audit trail, and Shopify cost tracker`
9. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Logger confirmed writing to stderr, not stdout
- [ ] CostTracker accurately tracks cumulative session costs
- [ ] Types exported from `@core/observability`
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
