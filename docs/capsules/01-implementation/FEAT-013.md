# FEAT-013: Shopify Tools — Inventory (7 Tools)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Tools/Inventory |
| **Complexity** | M |
| **Estimated Sessions** | 3 |
| **Depends On** | FEAT-006, FEAT-009 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can check inventory levels by item, SKU, or location
- As a developer, I can adjust or set inventory quantities
- As a developer, I can get a low stock report for items below a threshold
- As a developer, all inventory tools include Shopify API cost data in responses

---

## 1. Executive Context

**Product Intent:** Implement all 7 inventory-domain tools covering inventory lookup, location-based queries, stock reports, and adjustments. Inventory management is critical for e-commerce operations — agents need to check stock levels and make adjustments.

**System Position:** `src/shopify/tools/inventory/`. Co-located `.tool.ts` + `.graphql` + `.test.ts` per tool. Registered via barrel exports.

---

## 2. Feature Specification

### What Exists Today
FEAT-006 tool engine. FEAT-009 Shopify client. Empty `src/shopify/tools/inventory/` directory.

### What Must Be Built

#### Read Tools (Tier 1, scopes: `read_inventory`)
1. **get_inventory_item** — Get inventory item by GID. Returns sku, tracked, inventoryLevels (quantities per location).
2. **get_inventory_by_sku** — Look up inventory item by SKU string. Uses `inventoryItems(query: "sku:VALUE")`.
3. **list_inventory_levels** — List inventory levels across all locations. Pagination supported. Returns location name + available/committed/on_hand quantities.
4. **get_location_inventory** — Get all inventory at a specific location. Returns items with sku, available, incoming.
5. **low_stock_report** — Custom handler tool: queries inventory, filters items below threshold, returns sorted list with product name, sku, available quantity, location.

#### Write Tools (Tier 1, scopes: `write_inventory`)
6. **adjust_inventory** — Adjust inventory quantity (add/subtract delta) at a specific location. Uses `inventoryAdjustQuantities` mutation.
7. **set_inventory_level** — Set inventory to an exact quantity at a specific location. Uses `inventorySetQuantities` mutation.

### low_stock_report Response Shape
```json
{
  "count": 5,
  "threshold": 10,
  "items": [
    {
      "productTitle": "Classic Hoodie",
      "variantTitle": "Small / Black",
      "sku": "HOOD-SM",
      "available": 3,
      "location": "Main Warehouse"
    }
  ]
}
```

### Risk Assessment
- **Inventory API complexity:** Shopify 2024+ uses `inventoryAdjustQuantities` (not the deprecated `inventoryAdjustQuantity`). Must use the current mutation.
- **Location-scoped operations:** Adjust and set operations require a location ID. Tools must accept location_id parameter.
- **low_stock_report cost:** This tool may need multiple paginated queries to scan all inventory. Use custom handler with pagination loop.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §10 | Inventory tool inventory |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.1 | defineTool() pattern (handler tools) |

---

## 4. Scope Guardrails

### In Scope
- All 7 inventory tools with defineTool() + GraphQL
- low_stock_report as a custom handler tool
- Location-aware inventory operations
- Unit tests for each tool

### Out of Scope
- Inventory transfer between locations
- Incoming inventory (purchase orders)
- Inventory item creation/deletion (managed via products)
- Inventory tracking enablement
- Bulk inventory updates

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/tools/inventory/get-inventory-item.tool.ts` | Get inventory item |
| Create | `src/shopify/tools/inventory/get-inventory-item.graphql` | GraphQL query |
| Create | `src/shopify/tools/inventory/get-inventory-item.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/get-inventory-by-sku.tool.ts` | Get by SKU |
| Create | `src/shopify/tools/inventory/get-inventory-by-sku.graphql` | GraphQL query |
| Create | `src/shopify/tools/inventory/get-inventory-by-sku.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/list-inventory-levels.tool.ts` | List levels |
| Create | `src/shopify/tools/inventory/list-inventory-levels.graphql` | GraphQL query |
| Create | `src/shopify/tools/inventory/list-inventory-levels.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/get-location-inventory.tool.ts` | Location inventory |
| Create | `src/shopify/tools/inventory/get-location-inventory.graphql` | GraphQL query |
| Create | `src/shopify/tools/inventory/get-location-inventory.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/low-stock-report.tool.ts` | Low stock report |
| Create | `src/shopify/tools/inventory/low-stock-report.graphql` | GraphQL query |
| Create | `src/shopify/tools/inventory/low-stock-report.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/adjust-inventory.tool.ts` | Adjust quantity |
| Create | `src/shopify/tools/inventory/adjust-inventory.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/inventory/adjust-inventory.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/set-inventory-level.tool.ts` | Set quantity |
| Create | `src/shopify/tools/inventory/set-inventory-level.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/inventory/set-inventory-level.test.ts` | Tests |
| Create | `src/shopify/tools/inventory/index.ts` | Barrel export |
| Delete | `src/shopify/tools/inventory/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] All 7 inventory tools defined with `defineTool()`
- [ ] Read tools (5) use scope `read_inventory`, some also `read_products`
- [ ] Write tools (2) use scope `write_inventory`
- [ ] get_inventory_item returns sku, tracked status, levels per location
- [ ] get_inventory_by_sku looks up by SKU string
- [ ] list_inventory_levels returns location name + quantities
- [ ] get_location_inventory returns all items at a location
- [ ] low_stock_report uses custom handler to filter below threshold
- [ ] adjust_inventory uses `inventoryAdjustQuantities` mutation (not deprecated API)
- [ ] set_inventory_level uses `inventorySetQuantities` mutation
- [ ] Both write tools accept location_id parameter
- [ ] All tools registered via barrel export
- [ ] All tools have unit tests

---

## 7. Required Test Enforcement

### Per-Tool Tests (mock `ctx.shopify.query()`)
```
Each tool:
- calls correct GraphQL with variables
- maps response correctly
- handles empty/error result

Specific tests:
- get_inventory_by_sku: passes sku query filter
- low_stock_report: filters items below threshold, returns count + sorted items
- low_stock_report: handles empty inventory (returns count: 0)
- adjust_inventory: passes delta (positive = add, negative = subtract), location_id, inventory_item_id
- set_inventory_level: passes exact quantity, location_id, inventory_item_id
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Research Shopify Admin GraphQL API for Inventory: `inventoryItem`, `inventoryItems`, `inventoryLevel`, `location`, `inventoryAdjustQuantities`, `inventorySetQuantities`
2. Verify current mutation names (not deprecated ones)
3. Design GraphQL queries for all 7 tools
4. **STOP — present query designs**

### Session 2: Implement Read Tools (5 tools)
1. Write all 5 read tools with GraphQL and tests
2. Run tests — all pass
3. **STOP**

### Session 3: Implement Write Tools + Finalize
1. Write 2 write tools with GraphQL and tests
2. Write barrel export
3. Run full test suite — all pass
4. Run `pnpm lint && pnpm build` — clean
5. **Commit:** `feat(tools/inventory): add 7 inventory tools with location-aware operations`
6. **STOP**

---

## 9. Definition of Done

- [ ] All 7 inventory tools implemented and tested
- [ ] All tests pass, lint + build clean
- [ ] Uses current (non-deprecated) Shopify inventory mutations
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
