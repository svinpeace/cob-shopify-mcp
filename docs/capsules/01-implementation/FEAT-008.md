# FEAT-008: Core Transport Layer

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Core Infrastructure |
| **Domain** | Core/Transport |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-001, FEAT-002 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can run the MCP server over stdio for local use with Claude Desktop, Cursor, VS Code
- As a developer, I can run the MCP server over Streamable HTTP for remote/hosted deployments
- As a developer, the transport is selected from config (`transport.type: stdio | http`)

---

## 1. Executive Context

**Product Intent:** Support two MCP transports: stdio (default, local) and Streamable HTTP (remote/hosted). stdio is the standard for desktop MCP clients (Claude Desktop, Cursor, VS Code). HTTP enables hosted deployments where the server runs remotely and clients connect over the network.

**System Position:** `src/core/transport/`. The transport layer creates the appropriate MCP SDK transport object and passes it to `McpServer.connect()`. It is configured via `transport.type` from FEAT-002 config and consumed by the server wiring in FEAT-015.

---

## 2. Feature Specification

### What Exists Today
FEAT-001 scaffold with empty `src/core/transport/` directory. FEAT-002 config with `transport.type` and `transport.http_port`.

### What Must Be Built

1. **Transport Types** (`src/core/transport/types.ts`)
   ```typescript
   type TransportType = 'stdio' | 'http'

   interface TransportConfig {
     type: TransportType
     httpPort?: number              // default 3000, only used for HTTP transport
     httpHost?: string              // default '0.0.0.0', only used for HTTP transport
   }

   interface TransportFactory {
     create(config: TransportConfig): TransportInstance
   }

   interface TransportInstance {
     start(server: McpServer): Promise<void>
     stop(): Promise<void>
   }
   ```

2. **Stdio Transport** (`src/core/transport/stdio-transport.ts`)
   - Uses `@modelcontextprotocol/sdk/server/stdio.js` → `StdioServerTransport`
   - Creates transport, calls `server.connect(transport)`
   - Zero config required — reads from stdin, writes to stdout
   - Logs startup message to stderr (never stdout — MCP protocol)

3. **HTTP Transport** (`src/core/transport/http-transport.ts`)
   - Uses `@modelcontextprotocol/sdk/server/streamableHttp.js` → `StreamableHTTPServerTransport`
   - Creates an HTTP server (Node.js `http.createServer`)
   - Mounts the Streamable HTTP transport on the server
   - Configurable port (default 3000) and host (default 0.0.0.0)
   - Graceful shutdown on SIGTERM/SIGINT
   - Health check endpoint at `GET /health`
   - Logs server URL to stderr on startup

4. **Transport Factory** (`src/core/transport/factory.ts`)
   - `createTransport(config: TransportConfig): TransportInstance`
   - Returns StdioTransport or HttpTransport based on `config.type`
   - Throws clear error for unknown transport type

5. **Barrel Export** (`src/core/transport/index.ts`)

### Risk Assessment
- **stdout corruption:** stdio transport uses stdout for MCP protocol. ALL application output must go to stderr. pino logger already configured for stderr in FEAT-003.
- **HTTP transport security:** In hosted mode, the HTTP endpoint is open. Auth/CORS is out of scope for this capsule but should be flagged as future work.
- **Streamable HTTP vs SSE:** MCP SDK supports both. Streamable HTTP is the newer, recommended transport. SSE (Server-Sent Events) is legacy.
- **Port conflicts:** HTTP transport should handle EADDRINUSE gracefully with clear error message.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §6 | MCP server and transport design |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §14 | Deployment targets (local, Docker, cloud) |

---

## 4. Scope Guardrails

### In Scope
- Transport types and interfaces
- Stdio transport implementation
- Streamable HTTP transport implementation
- Transport factory with config-based selection
- Health check endpoint for HTTP transport
- Graceful shutdown for HTTP transport
- Unit tests for factory and transport setup

### Out of Scope
- HTTP authentication/authorization (future enhancement)
- CORS configuration (future enhancement)
- WebSocket transport
- SSE transport (legacy, not needed)
- TLS/HTTPS (handled by reverse proxy in production)
- Rate limiting on HTTP endpoint (handled by infra layer)

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/core/transport/types.ts` | Transport types |
| Create | `src/core/transport/stdio-transport.ts` | Stdio transport |
| Create | `src/core/transport/http-transport.ts` | Streamable HTTP transport |
| Create | `src/core/transport/factory.ts` | Transport factory |
| Create | `src/core/transport/factory.test.ts` | Factory tests |
| Create | `src/core/transport/stdio-transport.test.ts` | Stdio transport tests |
| Create | `src/core/transport/http-transport.test.ts` | HTTP transport tests |
| Create | `src/core/transport/index.ts` | Barrel export |
| Delete | `src/core/transport/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] `TransportType`, `TransportConfig`, `TransportInstance` types exported
- [ ] Stdio transport creates `StdioServerTransport` and connects to McpServer
- [ ] Stdio transport logs startup to stderr (not stdout)
- [ ] HTTP transport creates HTTP server on configured port
- [ ] HTTP transport creates `StreamableHTTPServerTransport` and wires to server
- [ ] HTTP transport responds to `GET /health` with 200 OK
- [ ] HTTP transport handles EADDRINUSE with clear error message
- [ ] HTTP transport shuts down gracefully on stop()
- [ ] Factory returns stdio transport for `type: 'stdio'`
- [ ] Factory returns HTTP transport for `type: 'http'`
- [ ] Factory throws for unknown transport type
- [ ] All types exported from barrel index

---

## 7. Required Test Enforcement

### Factory Tests (`src/core/transport/factory.test.ts`)
```
- returns StdioTransport instance for type stdio
- returns HttpTransport instance for type http
- throws for unknown transport type with helpful message
- uses default port 3000 when not specified for http
```

### Stdio Transport Tests (`src/core/transport/stdio-transport.test.ts`)
```
- creates StdioServerTransport (mock MCP SDK)
- calls server.connect with transport
- stop() is a no-op (stdio doesn't need cleanup)
```

### HTTP Transport Tests (`src/core/transport/http-transport.test.ts`)
```
- starts HTTP server on configured port
- health endpoint returns 200
- stop() closes the HTTP server
- handles EADDRINUSE error gracefully
- uses default host 0.0.0.0 when not configured
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §6 (MCP server, transport)
2. Read `@modelcontextprotocol/sdk` source for `StdioServerTransport` API
3. Read `@modelcontextprotocol/sdk` source for `StreamableHTTPServerTransport` API
4. Check how `McpServer.connect()` works with different transports
5. Design transport interface that abstracts both
6. **STOP — present transport design**

### Session 2: Implement
1. Write `types.ts`
2. Write `stdio-transport.ts`
3. Write `stdio-transport.test.ts` — run, verify pass
4. Write `http-transport.ts`
5. Write `http-transport.test.ts` — run, verify pass
6. **STOP**

### Session 3: Wire + Finalize
1. Write `factory.ts`
2. Write `factory.test.ts` — run, verify pass
3. Write `index.ts` barrel
4. Run full test suite — all pass
5. Run `pnpm lint && pnpm build` — clean
6. **Commit:** `feat(transport): add stdio and Streamable HTTP transports with factory`
7. **STOP**

---

## 9. Definition of Done

- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Stdio transport verified to never write to stdout
- [ ] HTTP transport verified with health check
- [ ] Graceful shutdown works
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
