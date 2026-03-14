# FEAT-016: CLI & Distribution

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | CLI & Distribution |
| **Domain** | CLI |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-002, FEAT-005, FEAT-015 |
| **Blocks** | None (final capsule) |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can run `npx cob-shopify-mcp` to start the MCP server with zero config
- As a developer, I can run `cob-shopify-mcp connect` to authorize a Shopify store via browser OAuth
- As a developer, I can run `cob-shopify-mcp config show` to see my resolved config
- As a developer, I can run `cob-shopify-mcp config validate` to check config validity
- As a developer, I can run `cob-shopify-mcp tools list` to see all available tools and their tiers
- As a developer, I can run `cob-shopify-mcp stores list` to see connected stores
- As a developer, the CLI has helpful error messages and `--help` on all commands

---

## 1. Executive Context

**Product Intent:** Provide a developer-friendly CLI built with `citty` that handles server startup, OAuth authorization, config management, tool discovery, and store management. The CLI is the primary developer interface — it must be polished, helpful, and work with `npx` out of the box.

**System Position:** `src/cli/`. The CLI imports from `@core/config`, `@core/auth`, `@core/storage`, and `src/server/bootstrap`. It uses `citty` for command parsing and `consola` for terminal output (colored, formatted). The CLI binary entry point is `dist/cli/index.mjs` configured in `package.json` bin.

---

## 2. Feature Specification

### What Exists Today
FEAT-015 server bootstrap. FEAT-002 config system. FEAT-005 auth system. Empty `src/cli/` directory.

### What Must Be Built

1. **CLI Entry Point** (`src/cli/index.ts`)
   - Main CLI using `citty` with `defineCommand` and `runMain`
   - Subcommands: `start`, `connect`, `config`, `tools`, `stores`
   - Default command (no subcommand): same as `start`
   - Global options: `--config <path>`, `--log-level <level>`, `--version`, `--help`

2. **start Command** (`src/cli/commands/start.ts`)
   - Starts the MCP server using `bootstrap()`
   - Options: `--transport <stdio|http>`, `--port <number>`, `--read-only`
   - Default: stdio transport
   - Displays startup banner with server info to stderr

3. **connect Command** (`src/cli/commands/connect.ts`)
   - Initiates OAuth authorization code flow
   - Options: `--store <domain>`, `--scopes <comma-separated>`
   - Triggers `AuthorizationCodeProvider` to start browser redirect flow
   - Displays connection result (success/failure, store domain, granted scopes)
   - Saves token via storage backend

4. **config Command Group** (`src/cli/commands/config/`)
   - `config show` — Display resolved config (with secrets masked)
   - `config validate` — Validate config and report errors
   - `config init` — Generate starter config file (interactive prompts)
   - `config show` masks `auth.access_token`, `auth.client_secret` (shows `shpat_****`)

5. **tools Command Group** (`src/cli/commands/tools/`)
   - `tools list` — List all registered tools with name, domain, tier, enabled/disabled status
   - `tools list --domain products` — Filter by domain
   - `tools list --tier 1` — Filter by tier
   - `tools info <tool_name>` — Show tool details: description, input schema, scopes, tier
   - Output as formatted table using consola

6. **stores Command Group** (`src/cli/commands/stores/`)
   - `stores list` — List connected stores (domain, auth method, status, connected date)
   - `stores remove <domain>` — Remove store connection and token
   - Reads from storage backend

7. **CLI Utilities** (`src/cli/utils.ts`)
   - `maskSecret(value: string): string` — masks tokens (`shpat_****...`)
   - `formatTable(data: Record<string, unknown>[]): string` — simple table formatter
   - `printBanner(): void` — startup banner with version, transport, store info

### CLI Output Examples

**`cob-shopify-mcp start`:**
```
🔧 cob-shopify-mcp v0.1.0
   Transport: stdio
   Store: my-store.myshopify.com
   Tools: 49 enabled (15 products, 12 orders, 9 customers, 7 inventory, 6 analytics)
   Auth: static token (shpat_****)
   Ready for MCP connections
```

**`cob-shopify-mcp tools list`:**
```
  Name                        Domain      Tier  Status
  ─────────────────────────────────────────────────────
  list_products               products    1     enabled
  get_product                 products    1     enabled
  create_product              products    1     enabled
  ...
  adjust_inventory            inventory   1     enabled
  sales_summary               analytics   1     enabled
```

**`cob-shopify-mcp config validate`:**
```
✓ Config loaded from ./cob-shopify-mcp.config.yaml
✓ Auth: static token configured
✓ Storage: json (path: ~/.cob-shopify-mcp/)
✓ Transport: stdio
✓ 49 tools enabled, 0 disabled
✓ Config is valid
```

### Risk Assessment
- **npx compatibility:** The `bin` entry must point to correct built output. Must include shebang `#!/usr/bin/env node` in CLI entry.
- **Config init interactivity:** Interactive prompts may not work in all environments. Provide `--yes` flag for defaults.
- **Secret masking:** Must be thorough — config show should never print full tokens.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §7 | CLI design |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §14 | Distribution & deployment |

---

## 4. Scope Guardrails

### In Scope
- CLI with all commands (start, connect, config, tools, stores)
- citty command framework
- consola formatted output
- Secret masking in config display
- Tool listing with filter
- Store management
- Config validation
- npx / global install support
- Unit tests for CLI commands (mock dependencies)

### Out of Scope
- Docker image creation (separate DevOps task)
- npm publishing workflow
- Auto-update mechanism
- Shell completion scripts
- CLI plugins/extensions

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/cli/index.ts` | CLI entry point |
| Create | `src/cli/commands/start.ts` | start command |
| Create | `src/cli/commands/connect.ts` | connect command |
| Create | `src/cli/commands/config/show.ts` | config show |
| Create | `src/cli/commands/config/validate.ts` | config validate |
| Create | `src/cli/commands/config/init.ts` | config init |
| Create | `src/cli/commands/config/index.ts` | config command group |
| Create | `src/cli/commands/tools/list.ts` | tools list |
| Create | `src/cli/commands/tools/info.ts` | tools info |
| Create | `src/cli/commands/tools/index.ts` | tools command group |
| Create | `src/cli/commands/stores/list.ts` | stores list |
| Create | `src/cli/commands/stores/remove.ts` | stores remove |
| Create | `src/cli/commands/stores/index.ts` | stores command group |
| Create | `src/cli/utils.ts` | CLI utilities |
| Create | `src/cli/utils.test.ts` | Utility tests |
| Create | `src/cli/commands/start.test.ts` | Start command tests |
| Create | `src/cli/commands/config/validate.test.ts` | Validate command tests |
| Create | `src/cli/commands/tools/list.test.ts` | Tools list tests |
| Modify | `package.json` | Add `citty`, `consola` dependencies |
| Delete | `src/cli/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `cob-shopify-mcp` runs as CLI binary (npx and global install)
- [ ] `cob-shopify-mcp start` starts the MCP server with default config
- [ ] `cob-shopify-mcp start --transport http --port 8080` starts HTTP server
- [ ] `cob-shopify-mcp start --read-only` starts with all mutations disabled
- [ ] `cob-shopify-mcp connect --store my-store.myshopify.com` initiates OAuth flow
- [ ] `cob-shopify-mcp config show` displays resolved config with secrets masked
- [ ] `cob-shopify-mcp config validate` checks and reports config validity
- [ ] `cob-shopify-mcp config init` generates starter YAML config file
- [ ] `cob-shopify-mcp tools list` shows all tools with domain, tier, status
- [ ] `cob-shopify-mcp tools list --domain products` filters by domain
- [ ] `cob-shopify-mcp tools info list_products` shows tool details
- [ ] `cob-shopify-mcp stores list` shows connected stores
- [ ] `cob-shopify-mcp stores remove <domain>` removes store connection
- [ ] All commands have `--help` output
- [ ] `--version` shows package version
- [ ] CLI output goes to stderr (stdout reserved for MCP protocol in start mode)

---

## 7. Required Test Enforcement

### Utility Tests (`src/cli/utils.test.ts`)
```
- maskSecret masks shpat_ tokens (shows first 8 + ****)
- maskSecret masks client_secret values
- maskSecret passes through non-secret values unchanged
- formatTable produces aligned column output
```

### Start Command Tests (`src/cli/commands/start.test.ts`)
```
- calls bootstrap with default config
- passes --transport option to config
- passes --port option to config
- passes --read-only to config
```

### Config Validate Tests (`src/cli/commands/config/validate.test.ts`)
```
- reports valid config with success messages
- reports invalid config with error details
- checks auth configuration presence
```

### Tools List Tests (`src/cli/commands/tools/list.test.ts`)
```
- lists all registered tools
- filters by --domain option
- filters by --tier option
- shows enabled/disabled status per config
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §7 (CLI) and §14 (distribution)
2. Read `citty` API — `defineCommand`, `runMain`, subcommands, options
3. Read `consola` API — formatted output, colors, tables
4. Design CLI command tree and option parsing
5. **STOP — present CLI design**

### Session 2: Implement Core Commands
1. Add `citty` and `consola` to package.json
2. Write `src/cli/utils.ts` + tests
3. Write `src/cli/index.ts` (main command)
4. Write `start.ts` command
5. Write `connect.ts` command
6. **STOP**

### Session 3: Implement Management Commands
1. Write config command group (show, validate, init)
2. Write tools command group (list, info)
3. Write stores command group (list, remove)
4. Write tests for each
5. **STOP**

### Session 4: Finalize
1. Update `package.json` bin entry for CLI
2. Verify `npx cob-shopify-mcp --help` works
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(cli): add CLI with start, connect, config, tools, and stores commands`
6. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] CLI binary works with npx
- [ ] All commands have --help
- [ ] Secrets are masked in all output
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
