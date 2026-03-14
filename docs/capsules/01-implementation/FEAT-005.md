# FEAT-005: Core Auth System

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Auth |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-002, FEAT-003, FEAT-004 |
| **Blocks** | FEAT-006, FEAT-009 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can authenticate with a static `shpat_` access token via env var
- As a developer, I can authenticate with OAuth client credentials (client_id + client_secret) and get auto-refreshing tokens
- As a developer, I can run `cob-shopify-mcp connect` for OAuth authorization code flow with browser redirect
- As a developer, the auth method is auto-detected from my config/env vars

---

## 1. Executive Context

**Product Intent:** Support all three Shopify authentication strategies behind a unified interface. Auth is auto-detected from config — devs don't need to specify which method, just provide the right credentials.

**System Position:** `src/core/auth/`. The auth interface is API-agnostic (in core). The Shopify-specific OAuth implementations use `@shopify/shopify-api` but the interface itself doesn't know about Shopify. Auth provider is consumed by the Shopify GraphQL client (FEAT-009) to get tokens for API calls.

---

## 2. Feature Specification

### What Exists Today
FEAT-002 config with `auth.method`, `auth.store_domain`, `auth.access_token`, `auth.client_id`, `auth.client_secret`. FEAT-004 storage for token persistence.

### What Must Be Built

1. **Auth Interface** (`src/core/auth/auth.interface.ts`)
   ```typescript
   interface AuthProvider {
     type: 'static' | 'client-credentials' | 'authorization-code'
     getToken(storeDomain: string): Promise<string>
     refresh?(storeDomain: string): Promise<string>
     validate(storeDomain: string): Promise<boolean>
   }
   ```

2. **Static Token Provider** (`src/core/auth/static-token.ts`)
   - Reads token from config `auth.access_token`
   - No refresh — token is permanent
   - `validate()` — checks token format starts with `shpat_` or `shpca_`
   - Simplest provider, zero dependencies

3. **Client Credentials Provider** (`src/core/auth/client-credentials.ts`)
   - Uses `auth.client_id` + `auth.client_secret`
   - Exchanges credentials for access token via Shopify token endpoint
   - Token has 24hr TTL — auto-refresh before expiry
   - Persists token via StorageBackend
   - Uses `@shopify/shopify-api` for token exchange
   - Refresh runs automatically (timer-based, checks expiry before each `getToken()` call)

4. **Authorization Code Provider** (`src/core/auth/authorization-code.ts`)
   - Full OAuth redirect flow for public/partner apps
   - Spins up temporary HTTP server on `localhost:8787` for callback
   - Opens browser to Shopify install URL
   - Receives authorization code via callback
   - Exchanges code for offline access token
   - Stores token permanently via StorageBackend
   - This provider is triggered by CLI `connect` command, not auto-started

5. **Auth Factory** (`src/core/auth/factory.ts`)
   - `createAuthProvider(config, storage): AuthProvider`
   - Auto-detection logic:
     - `auth.access_token` present → StaticTokenProvider
     - `auth.client_id` + `auth.client_secret` present → ClientCredentialsProvider (default)
     - `auth.client_id` + `auth.client_secret` + `auth.method: 'authorization-code'` → AuthorizationCodeProvider
   - Throws clear error if no credentials found

6. **Types + Barrel** (`src/core/auth/types.ts`, `src/core/auth/index.ts`)

### Risk Assessment
- **OAuth callback server:** Must shut down after receiving callback. Timeout after 5 minutes if no callback received.
- **Token refresh race condition:** If multiple tools call `getToken()` simultaneously during refresh, only one refresh should execute.
- **Browser opening:** Use `open` npm package for cross-platform browser launch. Must work on Windows, macOS, Linux.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §4 | Auth system design |
| 2 | Shopify OAuth docs (https://shopify.dev/docs/apps/build/authentication-authorization) | OAuth flows reference |

---

## 4. Scope Guardrails

### In Scope
- Auth interface (API-agnostic)
- Static token provider
- Client credentials provider with auto-refresh
- Authorization code provider with browser redirect + temp HTTP server
- Auth factory with auto-detection
- Token persistence via StorageBackend
- Unit tests for all providers (mock HTTP calls)

### Out of Scope
- CLI `connect` command UX (FEAT-016 — but the provider itself is built here)
- Multi-store auth switching in a single session
- PKCE flow (Shopify doesn't require it for server apps)
- Token scoping/validation against Shopify API scopes

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/auth/auth.interface.ts` | Auth provider contract |
| Create | `src/core/auth/types.ts` | Auth types |
| Create | `src/core/auth/static-token.ts` | Static token provider |
| Create | `src/core/auth/client-credentials.ts` | Client credentials OAuth |
| Create | `src/core/auth/authorization-code.ts` | Auth code OAuth with browser |
| Create | `src/core/auth/factory.ts` | Auto-detection factory |
| Create | `src/core/auth/index.ts` | Barrel export |
| Create | `src/core/auth/static-token.test.ts` | Static token tests |
| Create | `src/core/auth/client-credentials.test.ts` | Client creds tests |
| Create | `src/core/auth/authorization-code.test.ts` | Auth code tests |
| Create | `src/core/auth/factory.test.ts` | Factory auto-detection tests |
| Modify | `package.json` | Add `@shopify/shopify-api`, `open` |
| Delete | `src/core/auth/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `AuthProvider` interface exported from `@core/auth`
- [ ] StaticTokenProvider returns configured access_token
- [ ] StaticTokenProvider.validate() checks token format
- [ ] ClientCredentialsProvider exchanges client_id/secret for access token
- [ ] ClientCredentialsProvider auto-refreshes before expiry
- [ ] ClientCredentialsProvider persists token via storage backend
- [ ] ClientCredentialsProvider handles concurrent refresh (only one refresh executes)
- [ ] AuthorizationCodeProvider starts temp HTTP server on configured port
- [ ] AuthorizationCodeProvider generates correct Shopify install URL with scopes
- [ ] AuthorizationCodeProvider exchanges code for offline access token
- [ ] AuthorizationCodeProvider shuts down server after callback or timeout
- [ ] Auth factory auto-detects static token from config
- [ ] Auth factory auto-detects client credentials from config
- [ ] Auth factory throws clear error when no credentials provided
- [ ] All providers log auth events via observability logger

---

## 7. Required Test Enforcement

### Static Token Tests
```
- getToken returns configured access_token
- validate returns true for valid shpat_ token
- validate returns false for empty string
```

### Client Credentials Tests (mock HTTP)
```
- exchanges client_id + secret for access token
- stores token via storage backend
- getToken returns cached token when not expired
- getToken refreshes when token near expiry
- concurrent getToken calls during refresh only trigger one refresh
- handles token exchange HTTP error with clear message
```

### Authorization Code Tests (mock HTTP server)
```
- generates correct Shopify install URL with scopes and redirect_uri
- exchanges authorization code for access token
- stores offline token via storage backend
- temp server shuts down after callback
- temp server times out after 5 minutes
```

### Factory Tests
```
- returns StaticTokenProvider when access_token in config
- returns ClientCredentialsProvider when client_id + secret in config
- returns AuthorizationCodeProvider when method is authorization-code
- throws when no credentials provided
- throws with helpful message listing what's needed
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §4 (auth system)
2. Check `@shopify/shopify-api` API for:
   - Client credentials token exchange
   - Authorization code flow
   - Token refresh patterns
3. Check `open` npm package API for cross-platform browser launch
4. Design the refresh mutex pattern (Promise-based lock)
5. **STOP — present findings**

### Session 2: Implement Core
1. Install deps: `pnpm add @shopify/shopify-api open`
2. Write `auth.interface.ts` and `types.ts`
3. Write `static-token.ts`
4. Write `static-token.test.ts` — run, verify pass
5. Write `factory.ts` (partial — static token only)
6. Write `factory.test.ts` (partial) — run, verify pass
7. **STOP**

### Session 3: Implement OAuth
1. Write `client-credentials.ts` with auto-refresh
2. Write `client-credentials.test.ts` — run, verify pass
3. Write `authorization-code.ts` with temp HTTP server
4. Write `authorization-code.test.ts` — run, verify pass
5. **STOP**

### Session 4: Wire + Finalize
1. Complete `factory.ts` with all providers
2. Complete `factory.test.ts`
3. Write `index.ts` barrel
4. Run full test suite — all pass
5. Run `pnpm lint && pnpm build` — clean
6. **Commit:** `feat(auth): add static token, client credentials, and authorization code auth providers`
7. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Auth factory auto-detection works for all three provider types
- [ ] Client credentials refresh is race-condition safe
- [ ] Authorization code server cleans up (no port leak)
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
