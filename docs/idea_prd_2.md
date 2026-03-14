Product Requirements Document
Shopify MCP Server (Self-Hosted First)

Version: 1.1
Distribution: GitHub + npm
Runtime: Node.js / TypeScript
Transport: MCP stdio

1. Product Overview

Shopify MCP Server is an open-source Model Context Protocol server that exposes Shopify store operations as structured MCP tools.

It enables:

AI agents

developer tools

automation pipelines

chatbots

CLI workflows

to safely interact with Shopify store data.

The server runs locally using stdio transport and communicates with Shopify through the Admin API.

Model Context Protocol
Shopify Admin API

2. Key Goals
Developer-first experience

Install with one command.

npx shopify-mcp

No Docker required.

Full Shopify operational coverage

Expose safe operations for:

products

orders

customers

inventory

Safe by default

No dangerous operations:

billing

payouts

payment processing

store configuration

Token efficient MCP

Avoid huge tool schemas in context.

Provide CLI discovery.

Open-source friendly

Anyone can run the server locally.

3. Non Goals

Not supported:

Shopify billing APIs

payout APIs

payment processing

theme editing

store admin configuration

These are excluded for security and trust reasons.

4. Target Users
Shopify developers

Building AI tools.

AI engineers

Connecting LLM agents to Shopify.

Automation builders

Creating store automation.

Internal store tools

Dashboards or chat assistants.

5. Distribution Strategy

The project will be distributed through:

GitHub

Primary open-source repository.

npm

Executable package.

Docker

Optional container distribution.

6. Installation Methods

Three installation methods supported.

Method 1 — NPX (recommended)
npx shopify-mcp

Runs the MCP server without installing globally.

Method 2 — Global install
npm install -g shopify-mcp
shopify-mcp
Method 3 — Docker
docker run shopify-mcp

Useful for CI and production.

7. System Architecture
AI Client / CLI
        │
        │ MCP
        ▼
Shopify MCP Server
(stdio transport)
        │
        │
Shopify Admin API
        │
        ▼
Shopify Store

The server acts as a bridge between MCP clients and Shopify.

8. Shopify Partner App Requirement

To access Shopify APIs, a Shopify Partner App must be created.

Shopify Partner Dashboard

Every developer using the MCP server must create their own app.

9. Creating a Shopify Partner App

Steps:

Step 1

Create account:

https://partners.shopify.com
Step 2

Create new app.

Select:

Custom App
Step 3

Configure OAuth redirect URL.

Example:

http://localhost:8787/oauth/callback
Step 4

Add required scopes.

read_products
write_products

read_orders
write_orders

read_customers
write_customers

read_inventory
write_inventory

read_locations
Step 5

Retrieve credentials.

SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
10. OAuth Flow

The MCP server must implement Shopify OAuth.

Flow:

User runs shopify-mcp connect

Browser opens Shopify install URL

Merchant installs app

Shopify redirects to MCP callback

Authorization code returned

MCP server exchanges code for token

Token stored locally

11. Token Storage

Tokens stored locally:

~/.shopify-mcp/

Files:

shops.json
tokens.json
config.json

Future versions may support:

SQLite

encrypted storage

12. Environment Configuration

Required environment variables:

SHOPIFY_CLIENT_ID
SHOPIFY_CLIENT_SECRET
SHOPIFY_API_VERSION
APP_URL

Example:

SHOPIFY_CLIENT_ID=abc
SHOPIFY_CLIENT_SECRET=xyz
APP_URL=http://localhost:8787
13. CLI Interface

The project includes a CLI.

Command:

shopify-mcp

Examples:

shopify-mcp connect
shopify-mcp products list
shopify-mcp orders get
shopify-mcp inventory low
14. MCP Tool Philosophy

Tools must be:

deterministic

minimal

schema validated

safe

Responses must be normalized JSON.

No raw Shopify payloads.

15. Product Tools

Read tools:

list_products
search_products
get_product
get_product_by_handle
list_product_variants
get_product_variant
list_collections
get_collection

Create tools:

create_product
create_product_variant
create_collection

Update tools:

update_product
update_product_variant
update_product_status
add_product_tags
remove_product_tags
16. Order Tools

Read tools:

list_orders
search_orders
get_order
get_order_by_name
get_order_timeline
get_order_fulfillment_status

Create tools:

create_draft_order
add_order_note
add_order_tag

Update tools:

update_order_tags
update_order_note
mark_order_paid
17. Customer Tools

Read tools:

list_customers
search_customers
get_customer
get_customer_orders
get_customer_lifetime_value

Create tools:

create_customer

Update tools:

update_customer
add_customer_tag
remove_customer_tag
18. Inventory Tools

Read tools:

get_inventory_item
get_inventory_by_sku
list_inventory_levels
get_location_inventory
low_stock_report

Update tools:

adjust_inventory
set_inventory_level
19. Analytics Tools

Safe analytics only.

sales_summary
top_products
orders_by_date_range
refund_rate_summary
repeat_customer_rate
inventory_risk_report
20. MCP Resources

Examples:

shopify://shop/info
shopify://shop/locations
shopify://shop/policies
shopify://shop/currencies

Resources provide contextual data.

21. Prompt Templates

Optional prompts:

inventory_risk_analysis
daily_sales_report
store_health_check
customer_support_summary

Prompts guide AI reasoning.

22. Security Model

Security measures:

Scope limitation

Minimal API scopes.

Write restrictions

Sensitive operations disabled.

Token encryption

Store tokens encrypted.

Audit logs

Track tool usage.

23. Rate Limiting

Shopify API limits must be respected.

Server must:

batch requests

paginate queries

cache results

24. Repository Structure
shopify-mcp/
 ├ src
 │ ├ server
 │ ├ oauth
 │ ├ shopify
 │ ├ tools
 │ ├ resources
 │ ├ prompts
 │ └ cli
 ├ package.json
 ├ Dockerfile
 ├ tsconfig.json
 ├ README.md
 └ LICENSE
25. Technology Stack

Language:

TypeScript

Runtime:

Node.js

Libraries:

MCP TypeScript SDK

Shopify GraphQL client

Zod validation

Express (OAuth server)

26. Local Testing (Before Publishing)

You must test both modes.

Without Docker
npm install
npm run dev

Then connect:

shopify-mcp connect
With Docker

Build:

docker build -t shopify-mcp .

Run:

docker run shopify-mcp
27. Publishing to npm

Steps:

Create npm account
https://npmjs.com
Login
npm login
Publish
npm publish

After publishing:

npx shopify-mcp

will work globally.

28. Observability

Metrics tracked:

tool usage

Shopify API latency

error rates

token usage

Logs stored locally.

29. Future Features

Possible improvements:

webhook sync

remote hosted MCP

store analytics dashboards

agent automation

30. Success Metrics

Success measured by:

GitHub stars

npm downloads

connected stores

MCP usage

Final Outcome

The Shopify MCP Server becomes a standard open-source bridge between Shopify and AI systems.

It enables developers to integrate Shopify with:

AI agents

automation tools

dashboards

chat assistants

while maintaining safety, simplicity, and portability.


