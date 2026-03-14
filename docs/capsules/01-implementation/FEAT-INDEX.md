# FEAT Index — cob-shopify-mcp Implementation Capsules

**Source:** Conversation-driven exploration of PRD files + architecture design doc
**Generated:** 2026-03-14
**Total Capsules:** 16 (16 approved, 0 rejected)

---

## Sprint 1 — Foundation (P0, ~10 sessions)
- [x] [FEAT-001](FEAT-001.md): Project Scaffold & Toolchain (S) — pnpm, TypeScript, tsup, Vitest, Biome, directory structure
- [ ] [FEAT-002](FEAT-002.md): Core Config System (M) — Zod schema, multi-source loader, env interpolation
- [ ] [FEAT-003](FEAT-003.md): Core Observability & Cost Tracking (S) — pino logger, audit trail, CostTracker
- [ ] [FEAT-004](FEAT-004.md): Core Storage Backends (M) — JSON + SQLite with AES-256-GCM encryption

## Sprint 2 — Core Engine (P0, ~14 sessions)
- [ ] [FEAT-005](FEAT-005.md): Core Auth System (L) — Static token, OAuth client credentials, OAuth authorization code
- [ ] [FEAT-006](FEAT-006.md): Core Tool Engine & Registry (L) — defineTool(), ToolRegistry, ToolEngine, YAML loader
- [ ] [FEAT-007](FEAT-007.md): Core MCP Primitives (M) — Resource & Prompt engines with define helpers
- [ ] [FEAT-008](FEAT-008.md): Core Transport Layer (M) — stdio + Streamable HTTP transports

## Sprint 3 — Shopify Shell (P0/P1, ~17 sessions)
- [ ] [FEAT-009](FEAT-009.md): Shopify GraphQL Client & Cost Engine (L) — Rate limiter, cache, retry, cost tracking
- [ ] [FEAT-010](FEAT-010.md): Shopify Tools — Products (L) — 15 tools (list, get, search, create, update, tags)
- [ ] [FEAT-011](FEAT-011.md): Shopify Tools — Orders (L) — 12 tools (list, search, get, draft, notes, tags)
- [ ] [FEAT-012](FEAT-012.md): Shopify Tools — Customers (M) — 9 tools (list, search, get, create, update, tags)
- [ ] [FEAT-013](FEAT-013.md): Shopify Tools — Inventory (M) — 7 tools (get, list, adjust, set, low stock)
- [ ] [FEAT-014](FEAT-014.md): Shopify Tools — Analytics (M) — 6 tools (sales, top products, refunds, repeat rate)

## Sprint 4 — Integration & CLI (P0, ~8 sessions)
- [ ] [FEAT-015](FEAT-015.md): MCP Server Wiring (L) — Resources, prompts, bootstrap, tool registration bridge
- [ ] [FEAT-016](FEAT-016.md): CLI & Distribution (L) — citty CLI with start, connect, config, tools, stores commands

---

## Dependency Chain

```
FEAT-001 (Scaffold)
├── FEAT-002 (Config)
│   ├── FEAT-003 (Observability)
│   │   ├── FEAT-004 (Storage)
│   │   │   └── FEAT-005 (Auth)
│   │   │       └── FEAT-009 (Shopify Client) ─┐
│   │   └── FEAT-009 (Shopify Client)           │
│   ├── FEAT-005 (Auth)                         │
│   ├── FEAT-006 (Tool Engine) ─────────────────┤
│   ├── FEAT-007 (MCP Primitives)               │
│   └── FEAT-008 (Transport)                    │
│                                               │
├── FEAT-010 (Products) ◄──────────────────────┤
├── FEAT-011 (Orders)   ◄──────────────────────┤
├── FEAT-012 (Customers)◄──────────────────────┤
├── FEAT-013 (Inventory)◄──────────────────────┤
├── FEAT-014 (Analytics)◄──────────────────────┘
│
└── FEAT-015 (Server Wiring) ◄── all above
    └── FEAT-016 (CLI) ◄── FEAT-015
```

**Parallel opportunities:**
- FEAT-006, FEAT-007, FEAT-008 can run in parallel (all depend only on FEAT-001, FEAT-002)
- FEAT-010, FEAT-011, FEAT-012, FEAT-013, FEAT-014 can run in parallel (all depend on FEAT-006 + FEAT-009)

---

## Priority Matrix

| Capsule | Priority | Complexity | Sessions | Domain |
|---------|----------|------------|----------|--------|
| FEAT-001 | P0 | S | 2 | Infrastructure |
| FEAT-002 | P0 | M | 3 | Core/Config |
| FEAT-003 | P0 | S | 2 | Core/Observability |
| FEAT-004 | P0 | M | 3 | Core/Storage |
| FEAT-005 | P0 | L | 4 | Core/Auth |
| FEAT-006 | P0 | L | 4 | Core/Engine |
| FEAT-007 | P1 | M | 3 | Core/Engine |
| FEAT-008 | P0 | M | 3 | Core/Transport |
| FEAT-009 | P0 | L | 4 | Shopify/Client |
| FEAT-010 | P0 | L | 4 | Shopify/Products |
| FEAT-011 | P0 | L | 4 | Shopify/Orders |
| FEAT-012 | P0 | M | 3 | Shopify/Customers |
| FEAT-013 | P0 | M | 3 | Shopify/Inventory |
| FEAT-014 | P1 | M | 3 | Shopify/Analytics |
| FEAT-015 | P0 | L | 4 | Server |
| FEAT-016 | P0 | L | 4 | CLI |

---

## Totals

| Priority | Count | Total Sessions |
|----------|-------|----------------|
| P0 | 14 | 47 |
| P1 | 2 | 6 |
| **Total** | **16** | **53** |

| Complexity | Count |
|------------|-------|
| S | 2 |
| M | 7 |
| L | 7 |

**49 Shopify tools** across 5 domains + **4 resources** + **4 prompts** + **full CLI**
