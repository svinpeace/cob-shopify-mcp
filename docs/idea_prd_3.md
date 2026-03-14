1. Shopify Partner App Setup (Required for OAuth)

Before your MCP server can talk to a store, you need a Shopify Partner App.

Shopify Partner Dashboard

Every developer running your MCP server will create their own app.

That keeps the project open-source and self-hostable.

Step 1 — Create Partner Account

Go to:

https://partners.shopify.com

Create a free account.

Step 2 — Create App

Inside dashboard:

Apps → Create App

Choose:

Custom App

App name example:

Shopify MCP Server
Step 3 — Configure OAuth Redirect

Your MCP server needs a redirect URL.

Example:

http://localhost:8787/oauth/callback

Later when hosting remotely this might become:

https://mcp.yourdomain.com/oauth/callback
Step 4 — Configure Scopes

Add minimal safe scopes.

read_products
write_products

read_orders
write_orders

read_customers
write_customers

read_inventory
write_inventory

read_locations

Do NOT include:

write_payment_terms
write_shopify_payments
write_billing
Step 5 — Save Credentials

After creating the app you get:

Client ID
Client Secret

You will store these in .env.

Example:

SHOPIFY_CLIENT_ID=xxxx
SHOPIFY_CLIENT_SECRET=xxxx
SHOPIFY_API_VERSION=2024-10
APP_URL=http://localhost:8787
2. Production-Grade Repo Structure

This structure is optimized for:

maintainability

open source contributors

MCP architecture

npm packaging

shopify-mcp/
│
├─ src/
│
│  ├─ server/
│  │   ├─ mcpServer.ts
│  │   ├─ toolRegistry.ts
│  │   └─ transport.ts
│  │
│  ├─ oauth/
│  │   ├─ oauthServer.ts
│  │   ├─ oauthRoutes.ts
│  │   └─ tokenStore.ts
│  │
│  ├─ shopify/
│  │   ├─ shopifyClient.ts
│  │   ├─ queries.ts
│  │   └─ mutations.ts
│  │
│  ├─ tools/
│  │   ├─ products/
│  │   ├─ orders/
│  │   ├─ customers/
│  │   └─ inventory/
│  │
│  ├─ resources/
│  │   ├─ shopInfo.ts
│  │   └─ locations.ts
│  │
│  ├─ prompts/
│  │   └─ storeHealth.ts
│  │
│  ├─ cli/
│  │   ├─ cli.ts
│  │   └─ commands.ts
│  │
│  └─ index.ts
│
├─ docker/
│  └─ Dockerfile
│
├─ scripts/
│  └─ publish.sh
│
├─ .env.example
├─ README.md
├─ package.json
├─ tsconfig.json
└─ LICENSE
Why this structure works

Each layer has a responsibility:

server/

Handles MCP protocol.

oauth/

Handles Shopify OAuth.

shopify/

All Shopify API logic.

tools/

Actual MCP tools.

cli/

CLI interface.

resources/

Read-only context endpoints.

prompts/

Optional AI workflows.

3. First 10 MCP Tools (Your MVP)

Do not start with 40 tools.

Start with 10 strong tools that cover most store questions.

These give maximum value early.

Tool 1 — get_shop_info

Purpose:

Return basic store information.

Example output:

store name
domain
currency
timezone
plan

Shopify GraphQL:

query {
  shop {
    name
    email
    currencyCode
    myshopifyDomain
    plan {
      displayName
    }
  }
}
Tool 2 — list_products

Arguments:

limit
status
vendor

Returns:

id
title
status
vendor
variants
Tool 3 — search_products

Arguments:

query
limit

Example query:

title:hoodie
tag:sale
vendor:Nike
Tool 4 — get_product

Arguments:

product_id

Returns:

title
description
variants
inventory
tags
Tool 5 — list_orders

Arguments:

limit
financial_status
fulfillment_status

Returns:

order_number
customer
total
status
created_at
Tool 6 — get_order

Arguments:

order_id

Returns full order information.

Tool 7 — search_customers

Arguments:

query
limit

Example:

email:test@email.com
Tool 8 — get_customer

Arguments:

customer_id

Returns:

name
email
order_count
total_spent
Tool 9 — get_inventory_by_sku

Arguments:

sku

Returns:

inventory levels
location
variant
Tool 10 — low_stock_report

Arguments:

threshold
limit

Returns products with inventory below threshold.

Example MCP Tool Implementation (TypeScript)

Example structure.

src/tools/products/listProducts.ts

Example code outline:

import { z } from "zod"

export const listProductsTool = {
  name: "list_products",

  description: "List products from Shopify store",

  inputSchema: z.object({
    limit: z.number().optional(),
    status: z.string().optional()
  }),

  handler: async ({ limit = 10, status }) => {
    const data = await shopifyClient.query(/* GraphQL query */)

    return {
      content: [
        {
          type: "json",
          json: data.products
        }
      ]
    }
  }
}
MCP Server Entry

Example:

src/server/mcpServer.ts
import { Server } from "@modelcontextprotocol/sdk/server"

const server = new Server({
  name: "shopify-mcp",
  version: "0.1.0"
})

server.registerTool(listProductsTool)
server.registerTool(getProductTool)
server.registerTool(listOrdersTool)
Testing Before npm Publish

Run locally:

npm install
npm run dev

Test CLI:

shopify-mcp connect

Test tools through MCP client.

Publishing to npm (Your First Time)

Step 1 — Create account

npmjs.com

Step 2 — Login

npm login

Step 3 — Publish

npm publish

After publishing anyone can run:

npx shopify-mcp
Dockerfile Example
FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm","start"]
How Someone Uses Your MCP

Developer installs:

npx shopify-mcp

Then:

shopify-mcp connect

OAuth connects store.

Then any MCP client can access tools.

Final Advice

Start with:

10 tools

OAuth working

local stdio server

CLI connect command

Ship that.

Then iterate.