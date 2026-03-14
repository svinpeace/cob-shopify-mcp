# FEAT-004: Core Storage Backends

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Storage |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-002, FEAT-003 |
| **Blocks** | FEAT-005 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I get JSON file storage by default with zero additional setup
- As a developer, I can switch to SQLite with token encryption for production use
- As a developer, I see a CLI warning when tokens are stored in plaintext JSON

---

## 1. Executive Context

**Product Intent:** Provide pluggable storage for tokens, shop connections, and audit data. JSON files are the zero-dep default for instant setup. SQLite with AES-256-GCM encryption is the production option for security-conscious deployments.

**System Position:** `src/core/storage/`. Consumed by auth (token persistence), audit trail (optional SQLite audit log), and CLI (store management commands). The storage backend is selected from config `storage.backend`.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold, FEAT-002 config system with `storage.backend`, `storage.path`, `storage.encrypt_tokens`.

### What Must Be Built

1. **Storage Interface** (`src/core/storage/storage.interface.ts`)
   ```typescript
   interface StorageBackend {
     // Token operations
     getToken(storeDomain: string): Promise<string | null>
     setToken(storeDomain: string, token: string, metadata?: TokenMetadata): Promise<void>
     removeToken(storeDomain: string): Promise<void>

     // Store operations
     listStores(): Promise<StoreEntry[]>
     getStore(storeDomain: string): Promise<StoreEntry | null>
     setStore(storeDomain: string, entry: StoreEntry): Promise<void>
     removeStore(storeDomain: string): Promise<void>

     // Config persistence
     getPersistedConfig(): Promise<Record<string, unknown> | null>
     setPersistedConfig(config: Record<string, unknown>): Promise<void>

     // Lifecycle
     initialize(): Promise<void>
     close(): Promise<void>
   }
   ```

2. **JSON Storage** (`src/core/storage/json-storage.ts`)
   - Stores data in `~/.cob-shopify-mcp/`:
     - `tokens.json` — `{ [storeDomain]: token }`
     - `stores.json` — `{ [storeDomain]: StoreEntry }`
     - `config.json` — persisted runtime config
   - Creates directory + files on first use
   - Atomic writes (write to temp file, then rename)
   - **Plaintext warning** on `initialize()` — logs warning via observability logger

3. **SQLite Storage** (`src/core/storage/sqlite-storage.ts`)
   - Single file: `~/.cob-shopify-mcp/store.db`
   - Tables: `tokens` (domain, encrypted_token, iv, created_at), `stores` (domain, data_json, created_at, updated_at), `config` (key, value_json), `audit_log` (id, tool, input_json, store, ts, duration_ms, status, cost_json)
   - **AES-256-GCM encryption** for tokens using Node.js `crypto` module
   - Encryption key derived from machine-specific seed (hostname + username hash) or user-provided `STORAGE_ENCRYPTION_KEY` env var
   - Uses `better-sqlite3` (synchronous, no native async needed)

4. **Encryption Utilities** (`src/core/storage/encryption.ts`)
   - `encrypt(plaintext: string, key: Buffer): { ciphertext: string, iv: string }`
   - `decrypt(ciphertext: string, iv: string, key: Buffer): string`
   - `deriveKey(seed?: string): Buffer` — derives 256-bit key
   - AES-256-GCM with random IV per encryption

5. **Storage Factory** (`src/core/storage/factory.ts`)
   - `createStorage(config): StorageBackend` — returns JSON or SQLite based on config
   - Validates config, handles missing deps gracefully (`better-sqlite3` is optional dep)

6. **Types** (`src/core/storage/types.ts`)
   - `StoreEntry` — `{ domain, scopes, installedAt, status, ownerEmail? }`
   - `TokenMetadata` — `{ createdAt, expiresAt?, authMethod }`

7. **Barrel Export** (`src/core/storage/index.ts`)

### Risk Assessment
- **Encryption key management:** Machine-derived key is convenient but not portable. Migrating `store.db` to another machine breaks decryption. Document this clearly.
- **better-sqlite3 is a native module:** Requires node-gyp build. Must be an optional dependency — JSON backend should work without it.
- **Atomic writes:** JSON files must use write-rename pattern to avoid corruption on crash.
- **File permissions:** Token files should be created with `0o600` (owner read/write only).

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §4.4 | Token storage design |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §13 | Security requirements |

---

## 4. Scope Guardrails

### In Scope
- StorageBackend interface
- JSON file backend with atomic writes and file permissions
- SQLite backend with AES-256-GCM token encryption
- Encryption utility with key derivation
- Storage factory with graceful fallback
- Plaintext token warning
- Full unit tests for both backends + encryption

### Out of Scope
- Key management service integration (AWS KMS, etc.)
- Remote storage backends
- Database migrations (schema is v1, no migration system yet)
- Audit log storage in SQLite (interface defined, wired in FEAT-003's audit module later)

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/storage/storage.interface.ts` | Storage backend contract |
| Create | `src/core/storage/types.ts` | StoreEntry, TokenMetadata types |
| Create | `src/core/storage/json-storage.ts` | JSON file backend |
| Create | `src/core/storage/sqlite-storage.ts` | SQLite + encrypted backend |
| Create | `src/core/storage/encryption.ts` | AES-256-GCM utilities |
| Create | `src/core/storage/factory.ts` | Backend factory |
| Create | `src/core/storage/index.ts` | Barrel export |
| Create | `src/core/storage/json-storage.test.ts` | JSON backend tests |
| Create | `src/core/storage/sqlite-storage.test.ts` | SQLite backend tests |
| Create | `src/core/storage/encryption.test.ts` | Encryption tests |
| Modify | `package.json` | Add `better-sqlite3` as optionalDependency, `@types/better-sqlite3` as devDep |
| Delete | `src/core/storage/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `StorageBackend` interface exported from `@core/storage`
- [ ] JSON backend creates `~/.cob-shopify-mcp/` directory on first use
- [ ] JSON backend stores/retrieves tokens correctly
- [ ] JSON backend stores/retrieves store entries correctly
- [ ] JSON backend uses atomic writes (temp file + rename)
- [ ] JSON backend creates files with `0o600` permissions
- [ ] JSON backend logs plaintext warning on initialize
- [ ] SQLite backend creates `store.db` on first use
- [ ] SQLite backend encrypts tokens with AES-256-GCM
- [ ] SQLite backend decrypts tokens correctly
- [ ] Encryption with different IVs produces different ciphertext for same plaintext
- [ ] `deriveKey()` with same seed produces same key (deterministic)
- [ ] `deriveKey()` with different seed produces different key
- [ ] `createStorage('json')` returns JSON backend
- [ ] `createStorage('sqlite')` returns SQLite backend
- [ ] `createStorage('sqlite')` throws helpful error if `better-sqlite3` not installed
- [ ] All CRUD operations work for both backends (tokens, stores, config)

---

## 7. Required Test Enforcement

### Encryption Tests (`src/core/storage/encryption.test.ts`)
```
- encrypt returns ciphertext and iv
- decrypt with correct key returns original plaintext
- decrypt with wrong key throws error
- different IVs produce different ciphertext
- deriveKey is deterministic with same seed
- deriveKey differs with different seed
```

### JSON Storage Tests (`src/core/storage/json-storage.test.ts`)
```
- initialize creates directory
- setToken + getToken roundtrip
- removeToken makes getToken return null
- listStores returns all stored stores
- setStore + getStore roundtrip
- removeStore makes getStore return null
- files created with restricted permissions (0o600)
- logs plaintext warning on initialize (capture logger output)
```

### SQLite Storage Tests (`src/core/storage/sqlite-storage.test.ts`)
```
- initialize creates store.db
- setToken encrypts and stores
- getToken decrypts and returns
- stored token in DB is not plaintext (read raw from DB)
- removeToken deletes from DB
- listStores returns all stores
- setStore + getStore roundtrip
- removeStore deletes from DB
```

All tests use temp directories (`os.tmpdir()`) — never write to real `~/.cob-shopify-mcp/`.

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §4.4 (token storage) and §13 (security)
2. Check `better-sqlite3` API for table creation, insert, select
3. Check Node.js `crypto` API for `createCipheriv`, `createDecipheriv` with `aes-256-gcm`
4. Check `fs.rename` for atomic writes on the target OS
5. Design SQLite schema (tables, columns, types)
6. **STOP — present schema + encryption design**

### Session 2: Implement Core
1. Install deps: `pnpm add -O better-sqlite3 && pnpm add -D @types/better-sqlite3`
2. Write `types.ts`
3. Write `storage.interface.ts`
4. Write `encryption.ts`
5. Write `encryption.test.ts` — run, verify pass
6. Write `json-storage.ts`
7. Write `json-storage.test.ts` — run, verify pass
8. **STOP**

### Session 3: Implement SQLite + Wire
1. Write `sqlite-storage.ts`
2. Write `sqlite-storage.test.ts` — run, verify pass
3. Write `factory.ts`
4. Write `index.ts` barrel
5. Run `pnpm test` — all pass
6. Run `pnpm lint && pnpm build` — clean
7. **Commit:** `feat(storage): add JSON and SQLite storage backends with AES-256-GCM encryption`
8. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass (both backends + encryption)
- [ ] `better-sqlite3` is optional — JSON backend works without it
- [ ] Lint + build clean
- [ ] Token files have restricted permissions
- [ ] Plaintext warning logged for JSON backend
- [ ] SQLite tokens verified encrypted in raw DB
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
