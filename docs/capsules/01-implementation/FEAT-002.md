# FEAT-002: Core Config System

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Config |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-001 |
| **Blocks** | FEAT-003, FEAT-004, FEAT-005, FEAT-006 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can configure the server via YAML, JSON, env vars, or `.env` file
- As a developer, I can validate my config and see clear error messages for invalid values
- As a developer, I can reference env vars in YAML config with `${VAR_NAME}` syntax

---

## 1. Executive Context

**Product Intent:** Provide a single, validated configuration system that loads from multiple sources with clear precedence rules. Every other module reads config through this system — it is the shared foundation.

**System Position:** `src/core/config/`. Consumed by every other core module (auth, storage, observability, transport, engine) and by the Shopify shell. Must be API-agnostic — no Shopify knowledge in the config loader, only in the config schema.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty `src/core/config/` directory.

### What Must Be Built

1. **Config Schema** (`src/core/config/schema.ts`)
   - Full Zod schema matching design doc §12
   - Sections: `auth`, `shopify`, `tools`, `transport`, `storage`, `observability`, `rate_limit`
   - All fields with types, defaults, and validation rules
   - Env var interpolation support (`${VAR_NAME}`)

2. **Config Loader** (`src/core/config/loader.ts`)
   - Load priority: env vars > `.env` file > `cob-shopify-mcp.config.yaml` > `cob-shopify-mcp.config.json` > defaults
   - YAML parsing via `yaml` package
   - `.env` parsing via `dotenv` package
   - Env var interpolation in YAML/JSON values
   - Deep merge of sources with priority
   - Zod validation with friendly error messages

3. **Config Types** (`src/core/config/types.ts`)
   - TypeScript types inferred from Zod schema
   - Exported `CobConfig` type used everywhere

4. **Config Singleton** (`src/core/config/index.ts`)
   - `loadConfig(overrides?)` — load and validate
   - `getConfig()` — retrieve loaded config (throws if not loaded)
   - Barrel export

### User Workflow
```yaml
# cob-shopify-mcp.config.yaml
auth:
  method: token
  store_domain: my-store.myshopify.com
  access_token: ${SHOPIFY_ACCESS_TOKEN}
shopify:
  api_version: "2026-01"
tools:
  read_only: false
transport:
  type: stdio
storage:
  backend: json
  path: ~/.cob-shopify-mcp/
observability:
  log_level: info
  audit_log: true
```

### Risk Assessment
- **Env var interpolation:** Must not use `eval()`. Use regex replacement only.
- **Path expansion:** `~` in `storage.path` must expand to actual home dir.
- **Sensitive values:** Config object must never be logged in full (tokens!).

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §12 | Full config reference |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.3 | Tool tier system & config precedence |

---

## 4. Scope Guardrails

### In Scope
- Zod config schema with all fields from design doc §12
- Config loader with multi-source priority
- Env var interpolation in YAML/JSON values
- `.env` file support via dotenv
- YAML + JSON config file support
- Path `~` expansion
- Friendly validation error messages
- `loadConfig()` and `getConfig()` exports
- Full unit tests for schema, loader, interpolation, merge logic

### Out of Scope
- CLI `config show` / `config validate` commands (FEAT-016)
- `config init` command (FEAT-016)
- Config file watching / hot reload
- Remote config loading

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/config/schema.ts` | Zod config schema |
| Create | `src/core/config/loader.ts` | Multi-source config loader |
| Create | `src/core/config/types.ts` | TypeScript types from Zod |
| Create | `src/core/config/index.ts` | Barrel export, singleton |
| Create | `src/core/config/schema.test.ts` | Schema validation tests |
| Create | `src/core/config/loader.test.ts` | Loader tests (env, yaml, merge, interpolation) |
| Modify | `package.json` | Add `yaml`, `dotenv` dependencies |
| Delete | `src/core/config/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] Zod schema validates a correct config without errors
- [ ] Zod schema rejects invalid config with clear error messages (wrong types, missing required fields)
- [ ] Config loads from YAML file when present
- [ ] Config loads from JSON file when present
- [ ] Env vars override file config values
- [ ] `.env` file values are available for interpolation
- [ ] `${VAR_NAME}` syntax in YAML values is replaced with env var value
- [ ] Missing env var in `${VAR_NAME}` throws clear error (not silently empty)
- [ ] `~` in `storage.path` expands to home directory
- [ ] Default values applied for all optional fields
- [ ] `getConfig()` throws if called before `loadConfig()`
- [ ] `loadConfig()` can be called with overrides that take highest priority
- [ ] `tools.read_only`, `tools.disable`, `tools.enable` fields all validate correctly
- [ ] `CobConfig` type is exported and usable in other modules

---

## 7. Required Test Enforcement

### Schema Tests (`src/core/config/schema.test.ts`)
```
- validates minimal valid config (just auth.store_domain + auth.access_token)
- applies defaults for all optional fields
- rejects unknown auth.method values
- rejects negative rate_limit.max_concurrent
- rejects invalid log_level values
- validates tools.disable as string array
- validates tools.enable as string array
- validates tools.custom_paths as string array
```

### Loader Tests (`src/core/config/loader.test.ts`)
```
- loads config from YAML file
- loads config from JSON file
- env vars override file values
- ${VAR_NAME} interpolation replaces with env value
- ${VAR_NAME} with missing var throws descriptive error
- ~ in storage.path expands to os.homedir()
- deep merges nested objects (env override of auth.method doesn't lose auth.store_domain)
- loadConfig() with overrides takes highest priority
- getConfig() throws before loadConfig() is called
- getConfig() returns frozen object (immutable)
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §12 (full config reference) — note every field, type, default
2. Read design doc §3.3 (tier system) — note config precedence rules
3. Check `yaml` npm package API for parsing
4. Check `dotenv` npm package API for .env loading
5. Design the Zod schema structure on paper
6. Identify all env var mappings (e.g., `SHOPIFY_ACCESS_TOKEN` → `auth.access_token`)
7. **STOP — present schema design before proceeding**

### Session 2: Plan
1. Write test file structure for schema.test.ts (all test cases)
2. Write test file structure for loader.test.ts (all test cases)
3. Design the `loadConfig()` pipeline: find file → parse → interpolate → merge → validate
4. Design env var → config path mapping table
5. **STOP — present plan before proceeding**

### Session 3: Implement
1. Install deps: `pnpm add yaml dotenv`
2. Write `src/core/config/types.ts` — CobConfig type
3. Write `src/core/config/schema.ts` — full Zod schema
4. Write `src/core/config/schema.test.ts` — run, verify pass
5. Write `src/core/config/loader.ts` — multi-source loader
6. Write `src/core/config/loader.test.ts` — run, verify pass
7. Write `src/core/config/index.ts` — barrel with loadConfig/getConfig
8. Run `pnpm test` — all pass
9. Run `pnpm lint` — clean
10. Run `pnpm build` — clean
11. **Commit:** `feat(config): add Zod config schema with multi-source loader`
12. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass (`pnpm test`)
- [ ] Lint clean (`pnpm lint`)
- [ ] Build clean (`pnpm build`)
- [ ] Types exported and importable from `@core/config`
- [ ] No `eval()` or `Function()` in interpolation logic
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
