# CLI Redesign — Implementation Capsules

**Source:** `docs/plans/2026-03-14-cli-redesign-design.md`
**Generated:** 2026-03-14
**Total Capsules:** 9 (9 FEAT, 0 GAP)

---

## Sprint 1 — Foundation (P0)
- [ ] [CLI-001](CLI-001.md): Action name derivation + Zod-to-citty converter (FEAT) — Pure utility functions for converting tool names to CLI action names and Zod schemas to citty arg definitions
- [ ] [CLI-002](CLI-002.md): Output formatting system (FEAT) — TTY detection, JSON output, --fields field selection, --jq filtering
- [ ] [CLI-003](CLI-003.md): toolToCommand() core converter (FEAT) — Central function converting ToolDefinition to CittyCommand with all wiring
- [ ] [CLI-007](CLI-007.md): Collision handling in ToolRegistry (FEAT) — Custom tool override with warning, reserved domain validation

## Sprint 2 — Wiring (P0)
- [ ] [CLI-004](CLI-004.md): Domain command registration + CLI entry point (FEAT) — Groups tools by domain, rewires CLI entry point, generates help

## Sprint 3 — Features (P1)
- [ ] [CLI-005](CLI-005.md): Schema introspection `--describe` (FEAT) — On-demand schema discovery for AI agents
- [ ] [CLI-006](CLI-006.md): Mutation safety `--dry-run` + confirmation (FEAT) — Dry-run, interactive confirmation, --yes bypass
- [ ] [CLI-008](CLI-008.md): Deprecation wrappers (FEAT) — Deprecation warnings on tools run/list/info

## Sprint 4 — Optimization (P2)
- [ ] [CLI-009](CLI-009.md): Build-time command generation (FEAT) — Pre-generate built-in commands at build time via tsup

---

## Dependency Chain
```
CLI-001 → CLI-003 → CLI-004 → CLI-005
CLI-002 → CLI-003        ↘→ CLI-006
CLI-007 → CLI-004        ↘→ CLI-008
                          ↘→ CLI-009
```

## Priority Matrix

| Capsule | Priority | Complexity | Domain |
|---------|----------|------------|--------|
| CLI-001 | P0 | XS | CLI/Core |
| CLI-002 | P0 | S | CLI |
| CLI-003 | P0 | M | CLI |
| CLI-004 | P0 | M | CLI |
| CLI-005 | P1 | S | CLI |
| CLI-006 | P1 | S | CLI |
| CLI-007 | P0 | XS | Core Registry |
| CLI-008 | P1 | XS | CLI |
| CLI-009 | P2 | M | CLI/Build |

## Totals
- **P0:** 5 capsules (CLI-001, CLI-002, CLI-003, CLI-004, CLI-007)
- **P1:** 3 capsules (CLI-005, CLI-006, CLI-008)
- **P2:** 1 capsule (CLI-009)
- **Effort:** 3 XS + 3 S + 3 M = ~8-10 days estimated
