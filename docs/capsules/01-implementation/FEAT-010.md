# FEAT-010: Shopify Tools — Products (15 Tools)

## 0. Capsule Metadata

| Field | Value |
|---|---|
| **Status** | Draft |
| **Priority** | P0 |
| **Feature Category** | Shopify Shell |
| **Domain** | Shopify/Tools/Products |
| **Complexity** | L |
| **Estimated Sessions** | 4 |
| **Depends On** | FEAT-006, FEAT-009 |
| **Blocks** | FEAT-015 |
| **Completion %** | 0% |

**User Stories:**
- As a developer, I can list, get, search, and manage products via MCP tools
- As a developer, product responses include title, variants, price, and SKU data
- As a developer, I can create, update, and manage product status and tags
- As a developer, all product tools include Shopify API cost data in responses

---

## 1. Executive Context

**Product Intent:** Implement all 15 product-domain tools covering the full CRUD lifecycle for products, variants, and collections. Products are the most-used Shopify resource — this is the primary domain for most MCP users.

**System Position:** `src/shopify/tools/products/`. Each tool is a co-located set of `.tool.ts` + `.graphql` + `.test.ts` files. Tools are registered via barrel exports consumed by the tool registry (FEAT-006).

---

## 2. Feature Specification

### What Exists Today
FEAT-006 tool engine with `defineTool()`, registry, and execution pipeline. FEAT-009 Shopify GraphQL client. Empty `src/shopify/tools/products/` directory.

### What Must Be Built

15 tools, each as a `defineTool()` call with co-located GraphQL:

#### Read Tools (Tier 1, scopes: `read_products`)
1. **list_products** — List products with filtering (status, vendor, product_type) and cursor pagination. Returns title, handle, status, vendor, productType, variants (first 10 with price, sku, inventoryQuantity), images (first 1), totalInventory.
2. **get_product** — Get single product by GID. Returns full product detail including all variants, images, metafields.
3. **get_product_by_handle** — Get product by URL handle (slug). Same response as get_product.
4. **search_products** — Search products by keyword query string. Uses Shopify's `products(query:)` with full-text search.
5. **list_product_variants** — List all variants for a product. Returns id, title, price, sku, inventoryQuantity, selectedOptions.
6. **get_product_variant** — Get single variant by GID. Returns full variant detail.
7. **list_collections** — List collections with cursor pagination. Returns id, title, handle, productsCount, image.
8. **get_collection** — Get single collection by GID with its products.

#### Write Tools (Tier 1, scopes: `write_products`)
9. **create_product** — Create new product with title, description, vendor, productType, status, tags, variants.
10. **create_product_variant** — Add variant to existing product with price, sku, options.
11. **create_collection** — Create new collection (manual or smart) with title, description, rules.
12. **update_product** — Update product fields (title, description, vendor, status, etc.).
13. **update_product_variant** — Update variant fields (price, sku, weight, etc.).
14. **update_product_status** — Change product status (ACTIVE, DRAFT, ARCHIVED).
15. **manage_product_tags** — Add or remove tags on a product.

### Tool Input/Output Patterns

**list_products input:**
```typescript
{
  limit: z.number().min(1).max(250).default(10),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  vendor: z.string().optional(),
  product_type: z.string().optional(),
  cursor: z.string().optional(),
}
```

**list_products response shape:**
```json
{
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "title": "Classic Hoodie",
      "handle": "classic-hoodie",
      "status": "ACTIVE",
      "vendor": "MyBrand",
      "productType": "Apparel",
      "totalInventory": 150,
      "variants": [
        { "id": "gid://...", "title": "Small", "price": "49.99", "sku": "HOOD-SM", "inventoryQuantity": 50 }
      ],
      "featuredImage": { "url": "https://..." }
    }
  ],
  "pageInfo": { "hasNextPage": true, "endCursor": "abc123" }
}
```

### Risk Assessment
- **GraphQL query complexity:** Product queries with variants + images can be expensive. Keep variant/image limits reasonable in default queries.
- **Mutation input validation:** Create/update tools need careful Zod validation to match Shopify's expected input format.
- **Product status mutations:** `update_product_status` uses `productUpdate` mutation, not a dedicated status endpoint.
- **Tag management:** Shopify stores tags as comma-separated string. `manage_product_tags` needs to handle add/remove atomically.

---

## 3. Authority Constraints

| # | Document | Role |
|---|---|---|
| 1 | `docs/plans/2026-03-14-architecture-design.md` §10 | Product tool inventory |
| 2 | `docs/plans/2026-03-14-architecture-design.md` §3.1 | defineTool() pattern |

---

## 4. Scope Guardrails

### In Scope
- All 15 product tools with defineTool() + GraphQL
- Co-located `.tool.ts` + `.graphql` + `.test.ts` per tool
- Barrel export for all product tools
- Unit tests for each tool (mock Shopify client)
- Proper cursor pagination for list tools
- Variant data (price, sku, inventoryQuantity) in product responses

### Out of Scope
- Product media upload (binary file handling)
- Product SEO fields management
- Product metafield CRUD (future Tier 2)
- Bulk product operations
- Product webhooks
- Smart collection rule evaluation

---

## 5. Impacted Surface Area

| Action | File | Purpose |
|---|---|---|
| Create | `src/shopify/tools/products/list-products.tool.ts` | List products tool |
| Create | `src/shopify/tools/products/list-products.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/list-products.test.ts` | Tests |
| Create | `src/shopify/tools/products/get-product.tool.ts` | Get product by ID |
| Create | `src/shopify/tools/products/get-product.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/get-product.test.ts` | Tests |
| Create | `src/shopify/tools/products/get-product-by-handle.tool.ts` | Get by handle |
| Create | `src/shopify/tools/products/get-product-by-handle.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/get-product-by-handle.test.ts` | Tests |
| Create | `src/shopify/tools/products/search-products.tool.ts` | Search products |
| Create | `src/shopify/tools/products/search-products.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/search-products.test.ts` | Tests |
| Create | `src/shopify/tools/products/list-product-variants.tool.ts` | List variants |
| Create | `src/shopify/tools/products/list-product-variants.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/list-product-variants.test.ts` | Tests |
| Create | `src/shopify/tools/products/get-product-variant.tool.ts` | Get variant |
| Create | `src/shopify/tools/products/get-product-variant.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/get-product-variant.test.ts` | Tests |
| Create | `src/shopify/tools/products/list-collections.tool.ts` | List collections |
| Create | `src/shopify/tools/products/list-collections.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/list-collections.test.ts` | Tests |
| Create | `src/shopify/tools/products/get-collection.tool.ts` | Get collection |
| Create | `src/shopify/tools/products/get-collection.graphql` | GraphQL query |
| Create | `src/shopify/tools/products/get-collection.test.ts` | Tests |
| Create | `src/shopify/tools/products/create-product.tool.ts` | Create product |
| Create | `src/shopify/tools/products/create-product.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/create-product.test.ts` | Tests |
| Create | `src/shopify/tools/products/create-product-variant.tool.ts` | Create variant |
| Create | `src/shopify/tools/products/create-product-variant.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/create-product-variant.test.ts` | Tests |
| Create | `src/shopify/tools/products/create-collection.tool.ts` | Create collection |
| Create | `src/shopify/tools/products/create-collection.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/create-collection.test.ts` | Tests |
| Create | `src/shopify/tools/products/update-product.tool.ts` | Update product |
| Create | `src/shopify/tools/products/update-product.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/update-product.test.ts` | Tests |
| Create | `src/shopify/tools/products/update-product-variant.tool.ts` | Update variant |
| Create | `src/shopify/tools/products/update-product-variant.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/update-product-variant.test.ts` | Tests |
| Create | `src/shopify/tools/products/update-product-status.tool.ts` | Update status |
| Create | `src/shopify/tools/products/update-product-status.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/update-product-status.test.ts` | Tests |
| Create | `src/shopify/tools/products/manage-product-tags.tool.ts` | Manage tags |
| Create | `src/shopify/tools/products/manage-product-tags.graphql` | GraphQL mutation |
| Create | `src/shopify/tools/products/manage-product-tags.test.ts` | Tests |
| Create | `src/shopify/tools/products/index.ts` | Barrel export |
| Delete | `src/shopify/tools/products/.gitkeep` | Replace with real files |

---

## 6. Acceptance Criteria

- [ ] All 15 product tools defined with `defineTool()` and co-located GraphQL
- [ ] Read tools (8): list_products, get_product, get_product_by_handle, search_products, list_product_variants, get_product_variant, list_collections, get_collection
- [ ] Write tools (7): create_product, create_product_variant, create_collection, update_product, update_product_variant, update_product_status, manage_product_tags
- [ ] All read tools use scope `read_products`
- [ ] All write tools use scope `write_products`
- [ ] list_products returns title, variants (with price, sku), status, vendor
- [ ] Cursor pagination works for list_products and list_collections
- [ ] get_product returns full detail including all variants and images
- [ ] search_products uses Shopify query syntax
- [ ] create_product accepts title, description, vendor, productType, status, tags, variants
- [ ] manage_product_tags supports both add and remove operations
- [ ] All tools registered via barrel export at `src/shopify/tools/products/index.ts`
- [ ] All tools have unit tests with mocked Shopify client

---

## 7. Required Test Enforcement

### Per-Tool Tests (1 test file per tool, mock `ctx.shopify.query()`)
```
Each read tool test:
- calls ctx.shopify.query with correct GraphQL and variables
- maps response correctly (response mapper or handler)
- handles empty result (no products/variants found)

Each write tool test:
- calls ctx.shopify.query with correct mutation and input variables
- returns created/updated resource from response
- handles userErrors from Shopify mutation response

Specific tests:
- list_products: default limit is 10, cursor pagination passes cursor variable
- get_product: passes product GID as variable
- search_products: passes query string to products(query:) filter
- create_product: maps input fields to ProductInput type
- manage_product_tags: adds new tags, removes specified tags
- update_product_status: maps status enum correctly
```

---

## 8. 4-Session Execution Model

### Session 1: Research
1. Read design doc §10 (product tools inventory)
2. Research Shopify Admin GraphQL API for Products: `products`, `product`, `productByHandle`, `productCreate`, `productUpdate` queries/mutations
3. Research Shopify ProductInput type for create/update mutations
4. Research Shopify tag management approach (tagsAdd/tagsRemove mutations)
5. Design GraphQL queries for all 15 tools
6. **STOP — present GraphQL query designs**

### Session 2: Implement Read Tools (8 tools)
1. Write all 8 read tools: `.tool.ts` + `.graphql` + `.test.ts`
2. Write barrel export
3. Run tests — all pass
4. **STOP**

### Session 3: Implement Write Tools (7 tools)
1. Write all 7 write tools: `.tool.ts` + `.graphql` + `.test.ts`
2. Update barrel export
3. Run tests — all pass
4. **STOP**

### Session 4: Finalize
1. Run full test suite — all pass
2. Run `pnpm lint && pnpm build` — clean
3. **Commit:** `feat(tools/products): add 15 product tools with GraphQL queries`
4. **STOP**

---

## 9. Definition of Done

- [ ] All 15 product tools implemented and tested
- [ ] All acceptance criteria pass
- [ ] All tests pass
- [ ] Lint + build clean
- [ ] Barrel export includes all 15 tools
- [ ] GraphQL queries are correct for Shopify Admin API v2026-01
- [ ] Committed

---

## 10. Research Notes
_(To be filled during Session 1)_

## 11. Execution Log
_(To be filled during implementation)_
