# FEAT-014: Shopify Tools — Analytics (6 Tools)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P1 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Tools/Analytics |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-006, FEAT-009 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can get sales summaries, top products, and order metrics by date range
- As a developer, I can get refund rates and repeat customer rates
- As a developer, I can get an inventory risk report (overstock/understock)
- As a developer, all analytics tools include Shopify API cost data in responses

---

## 1. Executive Context

**Product Intent:** Implement all 6 analytics tools that provide business intelligence from Shopify data. These are all custom handler tools — they aggregate data from multiple queries or compute metrics that Shopify doesn't provide as single endpoints. Analytics tools use longer cache TTLs (5 minutes) since the data changes slowly.

**System Position:** `src/shopify/tools/analytics/`. All analytics tools use custom `handler` functions in `defineTool()` (not simple graphql+response pattern) because they require data aggregation logic.

---

## 2. Feature Specification

### What Exists Today
FEAT-006 tool engine. FEAT-009 Shopify client. Empty `src/shopify/tools/analytics/` directory.

### What Must Be Built

All 6 tools are Tier 1 with scopes combining `read_orders`, `read_products`, `read_customers`, `read_inventory` as needed:

1. **sales_summary** — Sales totals and averages for a date range. Queries orders within the range, aggregates totalPriceSet. Returns: totalSales, orderCount, averageOrderValue, currency. Scopes: `read_orders`.
   ```typescript
   input: {
     start_date: z.string().describe('ISO 8601 date, e.g. 2026-01-01'),
     end_date: z.string().describe('ISO 8601 date, e.g. 2026-01-31'),
   }
   ```

2. **top_products** — Best-selling products by revenue or quantity in a date range. Queries orders, aggregates line items by product. Returns sorted list with productTitle, totalRevenue, totalQuantity, orderCount. Scopes: `read_orders`, `read_products`.
   ```typescript
   input: {
     start_date: z.string(),
     end_date: z.string(),
     sort_by: z.enum(['revenue', 'quantity']).default('revenue'),
     limit: z.number().min(1).max(50).default(10),
   }
   ```

3. **orders_by_date_range** — Order count and metrics grouped by day/week/month. Returns time series data. Scopes: `read_orders`.
   ```typescript
   input: {
     start_date: z.string(),
     end_date: z.string(),
     group_by: z.enum(['day', 'week', 'month']).default('day'),
   }
   ```

4. **refund_rate_summary** — Refund percentage and totals for a date range. Queries orders and refunds, computes rate. Returns: totalOrders, refundedOrders, refundRate, totalRefundAmount. Scopes: `read_orders`.
   ```typescript
   input: {
     start_date: z.string(),
     end_date: z.string(),
   }
   ```

5. **repeat_customer_rate** — Percentage of orders from repeat customers in a date range. Queries orders, groups by customer, counts those with >1 order. Returns: totalCustomers, repeatCustomers, repeatRate, averageOrdersPerRepeatCustomer. Scopes: `read_orders`, `read_customers`.
   ```typescript
   input: {
     start_date: z.string(),
     end_date: z.string(),
   }
   ```

6. **inventory_risk_report** — Products at overstock or understock risk. Compares current inventory levels against sales velocity. Returns items categorized as overstock, understock, or healthy. Scopes: `read_inventory`, `read_products`.
   ```typescript
   input: {
     days_of_stock_threshold: z.number().min(1).default(30),
     limit: z.number().min(1).max(100).default(25),
   }
   ```

### Risk Assessment
- **Query cost:** Analytics tools may issue multiple paginated queries to aggregate data. Must handle pagination loops efficiently.
- **Date range parsing:** Input dates must be validated and converted to Shopify's expected format.
- **Large data sets:** For stores with many orders, full-scan analytics can be expensive. Limit pagination to reasonable bounds.
- **Accuracy vs cost tradeoff:** For v1, accept approximate results from first N pages rather than scanning entire order history.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §10 | Analytics tool inventory |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.1 | defineTool() handler pattern |

---

## 4. Scope Guardrails

### In Scope
- All 6 analytics tools with custom handler functions
- Date range filtering for all time-based tools
- Data aggregation from paginated queries
- Unit tests with mocked query responses

### Out of Scope
- Real-time analytics / streaming
- Historical trend comparison (period-over-period)
- Export to CSV/Excel
- Scheduled report generation
- Dashboard visualization data format

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/tools/analytics/sales-summary.tool.ts` | Sales summary |
| Create | `src/shopify/tools/analytics/sales-summary.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/sales-summary.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/top-products.tool.ts` | Top products |
| Create | `src/shopify/tools/analytics/top-products.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/top-products.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/orders-by-date-range.tool.ts` | Orders by date |
| Create | `src/shopify/tools/analytics/orders-by-date-range.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/orders-by-date-range.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/refund-rate-summary.tool.ts` | Refund rate |
| Create | `src/shopify/tools/analytics/refund-rate-summary.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/refund-rate-summary.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/repeat-customer-rate.tool.ts` | Repeat rate |
| Create | `src/shopify/tools/analytics/repeat-customer-rate.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/repeat-customer-rate.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/inventory-risk-report.tool.ts` | Inventory risk |
| Create | `src/shopify/tools/analytics/inventory-risk-report.graphql` | GraphQL query |
| Create | `src/shopify/tools/analytics/inventory-risk-report.test.ts` | Tests |
| Create | `src/shopify/tools/analytics/index.ts` | Barrel export |
| Delete | `src/shopify/tools/analytics/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] All 6 analytics tools defined with `defineTool()` using custom handlers
- [ ] sales_summary returns totalSales, orderCount, averageOrderValue for date range
- [ ] top_products returns sorted product list by revenue or quantity
- [ ] orders_by_date_range returns time series grouped by day/week/month
- [ ] refund_rate_summary returns refundRate as percentage
- [ ] repeat_customer_rate returns repeatRate as percentage
- [ ] inventory_risk_report categorizes items as overstock/understock/healthy
- [ ] All tools validate date inputs
- [ ] All tools handle pagination for large datasets
- [ ] All tools registered via barrel export
- [ ] All tools have unit tests

---

## 7. Required Test Enforcement

### Per-Tool Tests (mock `ctx.shopify.query()`)
```
Each tool:
- calls ctx.shopify.query with correct date range filter
- aggregates response data correctly
- handles empty result (zero orders)
- returns expected response shape

Specific tests:
- sales_summary: sums totalPriceSet across orders, computes average
- top_products: sorts by revenue desc (default), sorts by quantity when specified
- orders_by_date_range: groups orders by day correctly
- refund_rate_summary: computes refundRate = refundedOrders / totalOrders * 100
- repeat_customer_rate: identifies repeat customers (>1 order)
- inventory_risk_report: classifies items based on days_of_stock_threshold
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Research Shopify Admin GraphQL API for order aggregation queries
2. Research how to filter orders by date range (`created_at:>2026-01-01 created_at:<2026-01-31`)
3. Design aggregation logic for each analytics tool
4. **STOP — present aggregation designs**

### Session 2: Implement First 3 Tools
1. Write sales_summary, top_products, orders_by_date_range with tests
2. Run tests — all pass
3. **STOP**

### Session 3: Implement Last 3 Tools + Finalize
1. Write refund_rate_summary, repeat_customer_rate, inventory_risk_report with tests
2. Write barrel export
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(tools/analytics): add 6 analytics tools with sales, customer, and inventory insights`
6. **STOP**

---

## 9. Definition of Done

- [ ] All 6 analytics tools implemented and tested
- [ ] All tests pass, lint + build clean
- [ ] Aggregation logic is correct for each tool
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
