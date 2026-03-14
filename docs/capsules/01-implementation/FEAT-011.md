# FEAT-011: Shopify Tools — Orders (12 Tools)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Tools/Orders |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-006, FEAT-009 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can list, search, and get orders with full line item detail, status, and tracking numbers
- As a developer, I can create draft orders, add notes/tags, and mark orders as paid
- As a developer, order responses include items, fulfillment status, and tracking data
- As a developer, all order tools include Shopify API cost data in responses

---

## 1. Executive Context

**Product Intent:** Implement all 12 order-domain tools. Orders are the second most critical domain — AI agents need to look up order details, check fulfillment status, and manage order metadata (notes, tags). The user specifically requires order items with full detail, status, and tracking numbers.

**System Position:** `src/shopify/tools/orders/`. Co-located `.tool.ts` + `.graphql` + `.test.ts` per tool. Registered via barrel exports.

---

## 2. Feature Specification

### What Exists Today
FEAT-006 tool engine. FEAT-009 Shopify client. Empty `src/shopify/tools/orders/` directory.

### What Must Be Built

12 tools, each as a `defineTool()` call:

#### Read Tools (Tier 1, scopes: `read_orders`)
1. **list_orders** — List orders with filtering (status, financial_status, fulfillment_status, created_at range) and cursor pagination. Returns order name, createdAt, totalPriceSet, displayFinancialStatus, displayFulfillmentStatus, customer (name, email), lineItems (first 10 with title, quantity, originalUnitPriceSet, sku, variant title), fulfillments (trackingInfo with number, url, company).
2. **search_orders** — Search orders by query string (customer name, email, order number, date range). Uses `orders(query:)`.
3. **get_order** — Get single order by GID with FULL detail: all lineItems, fulfillments with tracking, transactions, shippingAddress, billingAddress, customer, notes, tags, timeline events.
4. **get_order_by_name** — Get order by order number (e.g., "#1001"). Uses `orders(query: "name:#1001")`.
5. **get_order_timeline** — Get order events timeline (comments, status changes, fulfillments, refunds).
6. **get_order_fulfillment_status** — Get fulfillment status with tracking numbers, carrier, tracking URLs for each fulfillment.

#### Write Tools (Tier 1, scopes: `write_orders`)
7. **create_draft_order** — Create draft order with line items, customer, shipping address, note. Returns draft order with calculated totals.
8. **add_order_note** — Add/update private note on an order.
9. **add_order_tag** — Add a tag to an order.
10. **update_order_tags** — Set/replace order tags.
11. **update_order_note** — Update existing order note.
12. **mark_order_paid** — Mark an order as paid (orderMarkAsPaid mutation).

### Tool Response — Order Detail (get_order)
```json
{
  "order": {
    "id": "gid://shopify/Order/123",
    "name": "#1001",
    "createdAt": "2026-03-01T10:00:00Z",
    "displayFinancialStatus": "PAID",
    "displayFulfillmentStatus": "FULFILLED",
    "totalPriceSet": { "shopMoney": { "amount": "129.99", "currencyCode": "USD" } },
    "customer": { "id": "gid://...", "displayName": "John Doe", "email": "john@example.com" },
    "lineItems": [
      {
        "title": "Classic Hoodie",
        "quantity": 2,
        "originalUnitPriceSet": { "shopMoney": { "amount": "49.99", "currencyCode": "USD" } },
        "sku": "HOOD-SM",
        "variantTitle": "Small / Black"
      }
    ],
    "fulfillments": [
      {
        "status": "SUCCESS",
        "trackingInfo": [
          { "number": "1Z999AA10123456784", "url": "https://tracking.ups.com/...", "company": "UPS" }
        ]
      }
    ],
    "shippingAddress": { "address1": "123 Main St", "city": "Portland", "province": "OR", "zip": "97201", "country": "US" },
    "note": "Customer requested gift wrapping",
    "tags": ["vip", "gift"]
  }
}
```

### Risk Assessment
- **Order query cost:** Orders with many line items and fulfillments can be expensive queries. Paginate line items.
- **Draft order mutations:** `draftOrderCreate` has a complex input type with line items, customer, shipping.
- **Order search syntax:** Shopify's order search query syntax uses field:value pairs. Document valid search fields.
- **Financial status permissions:** Some order mutations may require additional scopes beyond `write_orders`.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §10 | Order tool inventory |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.1 | defineTool() pattern |

---

## 4. Scope Guardrails

### In Scope
- All 12 order tools with defineTool() + GraphQL
- Full line item detail in order responses (title, quantity, price, sku, variant)
- Fulfillment status and tracking numbers in order responses
- Customer info (name, email) in order responses
- Cursor pagination for list tools
- Unit tests for each tool

### Out of Scope
- Order refunds/cancellations (future Tier 2)
- Fulfillment creation (requires `write_fulfillments` scope, future)
- Order editing (line item add/remove after creation)
- Order risk analysis
- Order webhooks
- Bulk order operations

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/tools/orders/list-orders.tool.ts` | List orders |
| Create | `src/shopify/tools/orders/list-orders.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/list-orders.test.ts` | Tests |
| Create | `src/shopify/tools/orders/search-orders.tool.ts` | Search orders |
| Create | `src/shopify/tools/orders/search-orders.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/search-orders.test.ts` | Tests |
| Create | `src/shopify/tools/orders/get-order.tool.ts` | Get order |
| Create | `src/shopify/tools/orders/get-order.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/get-order.test.ts` | Tests |
| Create | `src/shopify/tools/orders/get-order-by-name.tool.ts` | Get by name |
| Create | `src/shopify/tools/orders/get-order-by-name.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/get-order-by-name.test.ts` | Tests |
| Create | `src/shopify/tools/orders/get-order-timeline.tool.ts` | Order timeline |
| Create | `src/shopify/tools/orders/get-order-timeline.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/get-order-timeline.test.ts` | Tests |
| Create | `src/shopify/tools/orders/get-order-fulfillment-status.tool.ts` | Fulfillment status |
| Create | `src/shopify/tools/orders/get-order-fulfillment-status.graphql` | GraphQL query |
| Create | `src/shopify/tools/orders/get-order-fulfillment-status.test.ts` | Tests |
| Create | `src/shopify/tools/orders/create-draft-order.tool.ts` | Create draft |
| Create | `src/shopify/tools/orders/create-draft-order.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/create-draft-order.test.ts` | Tests |
| Create | `src/shopify/tools/orders/add-order-note.tool.ts` | Add note |
| Create | `src/shopify/tools/orders/add-order-note.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/add-order-note.test.ts` | Tests |
| Create | `src/shopify/tools/orders/add-order-tag.tool.ts` | Add tag |
| Create | `src/shopify/tools/orders/add-order-tag.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/add-order-tag.test.ts` | Tests |
| Create | `src/shopify/tools/orders/update-order-tags.tool.ts` | Update tags |
| Create | `src/shopify/tools/orders/update-order-tags.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/update-order-tags.test.ts` | Tests |
| Create | `src/shopify/tools/orders/update-order-note.tool.ts` | Update note |
| Create | `src/shopify/tools/orders/update-order-note.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/update-order-note.test.ts` | Tests |
| Create | `src/shopify/tools/orders/mark-order-paid.tool.ts` | Mark paid |
| Create | `src/shopify/tools/orders/mark-order-paid.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/orders/mark-order-paid.test.ts` | Tests |
| Create | `src/shopify/tools/orders/index.ts` | Barrel export |
| Delete | `src/shopify/tools/orders/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] All 12 order tools defined with `defineTool()` and co-located GraphQL
- [ ] Read tools (6) use scope `read_orders`
- [ ] Write tools (6) use scope `write_orders`
- [ ] list_orders returns line items with title, quantity, price, sku, variant title
- [ ] list_orders returns fulfillment status and tracking numbers
- [ ] get_order returns full detail: all line items, fulfillments, customer, addresses, notes, tags
- [ ] get_order_fulfillment_status returns tracking number, URL, carrier company
- [ ] search_orders supports order number search (e.g., "#1001")
- [ ] create_draft_order accepts line items with variant_id and quantity
- [ ] Cursor pagination works for list_orders and search_orders
- [ ] All tools registered via barrel export
- [ ] All tools have unit tests

---

## 7. Required Test Enforcement

### Per-Tool Tests (mock `ctx.shopify.query()`)
```
Each read tool test:
- calls ctx.shopify.query with correct GraphQL and variables
- maps response correctly
- handles empty result

Each write tool test:
- calls correct mutation with input variables
- returns result from mutation response
- handles userErrors

Specific tests:
- list_orders: response includes lineItems with sku and variantTitle
- list_orders: response includes fulfillments with trackingInfo
- get_order: returns full detail including addresses and timeline
- get_order_by_name: formats order name query correctly (name:#1001)
- create_draft_order: maps line items to DraftOrderLineItemInput
- mark_order_paid: calls orderMarkAsPaid mutation
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Research Shopify Admin GraphQL API for Orders: `orders`, `order`, `draftOrderCreate`, `orderUpdate`, `orderMarkAsPaid`, `tagsAdd`
2. Research order query fields: lineItems, fulfillments, trackingInfo, transactions
3. Design GraphQL queries for all 12 tools
4. **STOP — present GraphQL query designs**

### Session 2: Implement Read Tools (6 tools)
1. Write all 6 read tools with GraphQL and tests
2. Run tests — all pass
3. **STOP**

### Session 3: Implement Write Tools (6 tools)
1. Write all 6 write tools with GraphQL and tests
2. Write barrel export
3. Run tests — all pass
4. **STOP**

### Session 4: Finalize
1. Run full test suite — all pass
2. Run `pnpm lint && pnpm build` — clean
3. **Commit:** `feat(tools/orders): add 12 order tools with full line item and tracking detail`
4. **STOP**

---

## 9. Definition of Done

- [ ] All 12 order tools implemented and tested
- [ ] Order responses include line items with sku, price, variant title
- [ ] Order responses include fulfillment tracking numbers
- [ ] All tests pass, lint + build clean
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
