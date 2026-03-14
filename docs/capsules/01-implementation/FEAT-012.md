# FEAT-012: Shopify Tools — Customers (9 Tools)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Tools/Customers |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-006, FEAT-009 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can list, search, and get customer details via MCP tools
- As a developer, I can view customer order history and lifetime value
- As a developer, I can create and update customers, manage customer tags
- As a developer, all customer tools include Shopify API cost data in responses

---

## 1. Executive Context

**Product Intent:** Implement all 9 customer-domain tools covering read, create, update, and tagging. Customer lookup is essential for support agents and CRM workflows.

**System Position:** `src/shopify/tools/customers/`. Co-located `.tool.ts` + `.graphql` + `.test.ts` per tool. Registered via barrel exports.

---

## 2. Feature Specification

### What Exists Today
FEAT-006 tool engine. FEAT-009 Shopify client. Empty `src/shopify/tools/customers/` directory.

### What Must Be Built

#### Read Tools (Tier 1, scopes: `read_customers`)
1. **list_customers** — List customers with cursor pagination. Returns displayName, email, phone, ordersCount, totalSpentV2, tags, state.
2. **search_customers** — Search by email, name, phone, or tag. Uses `customers(query:)`.
3. **get_customer** — Get single customer by GID with full detail: addresses, metafields, orders count, total spent, tags, note, state, createdAt.
4. **get_customer_orders** — List orders for a specific customer. Returns order summary (name, totalPrice, status, createdAt).
5. **get_customer_lifetime_value** — Total spending, order count, average order value, first/last order dates.

#### Write Tools (Tier 1, scopes: `write_customers`)
6. **create_customer** — Create new customer with firstName, lastName, email, phone, addresses, tags, note.
7. **update_customer** — Update customer fields (name, email, phone, note, addresses).
8. **add_customer_tag** — Add tag(s) to customer via `tagsAdd` mutation.
9. **remove_customer_tag** — Remove tag(s) from customer via `tagsRemove` mutation.

### Risk Assessment
- **Customer privacy:** Customer data includes PII (email, phone, addresses). Tools must not log sensitive fields in audit trail.
- **Lifetime value computation:** `get_customer_lifetime_value` uses customer's `totalSpentV2` and `ordersCount` from Shopify — not custom aggregation.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §10 | Customer tool inventory |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.1 | defineTool() pattern |

---

## 4. Scope Guardrails

### In Scope
- All 9 customer tools with defineTool() + GraphQL
- Customer order history and lifetime value
- Cursor pagination for list tools
- Tag management via tagsAdd/tagsRemove mutations
- Unit tests for each tool

### Out of Scope
- Customer segment queries
- Customer account management (invites, password reset)
- Customer metafield CRUD
- Bulk customer operations
- GDPR data request/deletion

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/tools/customers/list-customers.tool.ts` | List customers |
| Create | `src/shopify/tools/customers/list-customers.graphql` | GraphQL query |
| Create | `src/shopify/tools/customers/list-customers.test.ts` | Tests |
| Create | `src/shopify/tools/customers/search-customers.tool.ts` | Search customers |
| Create | `src/shopify/tools/customers/search-customers.graphql` | GraphQL query |
| Create | `src/shopify/tools/customers/search-customers.test.ts` | Tests |
| Create | `src/shopify/tools/customers/get-customer.tool.ts` | Get customer |
| Create | `src/shopify/tools/customers/get-customer.graphql` | GraphQL query |
| Create | `src/shopify/tools/customers/get-customer.test.ts` | Tests |
| Create | `src/shopify/tools/customers/get-customer-orders.tool.ts` | Customer orders |
| Create | `src/shopify/tools/customers/get-customer-orders.graphql` | GraphQL query |
| Create | `src/shopify/tools/customers/get-customer-orders.test.ts` | Tests |
| Create | `src/shopify/tools/customers/get-customer-lifetime-value.tool.ts` | Lifetime value |
| Create | `src/shopify/tools/customers/get-customer-lifetime-value.graphql` | GraphQL query |
| Create | `src/shopify/tools/customers/get-customer-lifetime-value.test.ts` | Tests |
| Create | `src/shopify/tools/customers/create-customer.tool.ts` | Create customer |
| Create | `src/shopify/tools/customers/create-customer.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/customers/create-customer.test.ts` | Tests |
| Create | `src/shopify/tools/customers/update-customer.tool.ts` | Update customer |
| Create | `src/shopify/tools/customers/update-customer.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/customers/update-customer.test.ts` | Tests |
| Create | `src/shopify/tools/customers/add-customer-tag.tool.ts` | Add tag |
| Create | `src/shopify/tools/customers/add-customer-tag.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/customers/add-customer-tag.test.ts` | Tests |
| Create | `src/shopify/tools/customers/remove-customer-tag.tool.ts` | Remove tag |
| Create | `src/shopify/tools/customers/remove-customer-tag.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/customers/remove-customer-tag.test.ts` | Tests |
| Create | `src/shopify/tools/customers/index.ts` | Barrel export |
| Delete | `src/shopify/tools/customers/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] All 9 customer tools defined with `defineTool()` and co-located GraphQL
- [ ] Read tools (5) use scope `read_customers`
- [ ] Write tools (4) use scope `write_customers`
- [ ] list_customers returns name, email, ordersCount, totalSpent, tags
- [ ] get_customer returns full detail with addresses and note
- [ ] get_customer_orders returns order list for specific customer
- [ ] get_customer_lifetime_value returns totalSpent, ordersCount, avgOrderValue
- [ ] create_customer accepts firstName, lastName, email, phone, addresses, tags
- [ ] add_customer_tag uses tagsAdd mutation
- [ ] remove_customer_tag uses tagsRemove mutation
- [ ] All tools registered via barrel export
- [ ] All tools have unit tests

---

## 7. Required Test Enforcement

### Per-Tool Tests (mock `ctx.shopify.query()`)
```
Each tool test:
- calls ctx.shopify.query with correct GraphQL and variables
- maps response correctly
- handles empty result or userErrors

Specific tests:
- list_customers: response includes ordersCount and totalSpentV2
- search_customers: passes query string for email/name/phone search
- get_customer_orders: passes customer GID, returns order list
- get_customer_lifetime_value: computes avgOrderValue from totalSpent / ordersCount
- create_customer: maps firstName, lastName, email to CustomerInput
- add_customer_tag: uses tagsAdd mutation with customer GID and tags array
- remove_customer_tag: uses tagsRemove mutation
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Research Shopify Admin GraphQL API for Customers: `customers`, `customer`, `customerCreate`, `customerUpdate`, `tagsAdd`, `tagsRemove`
2. Design GraphQL queries for all 9 tools
3. **STOP — present query designs**

### Session 2: Implement Read Tools (5 tools)
1. Write all 5 read tools with GraphQL and tests
2. Run tests — all pass
3. **STOP**

### Session 3: Implement Write Tools + Finalize
1. Write all 4 write tools with GraphQL and tests
2. Write barrel export
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(tools/customers): add 9 customer tools with order history and lifetime value`
6. **STOP**

---

## 9. Definition of Done

- [ ] All 9 customer tools implemented and tested
- [ ] All tests pass, lint + build clean
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
