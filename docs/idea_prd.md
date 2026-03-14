Product Requirements Document
Shopify MCP Server

Version: 1.0
Target: Open-source production-grade MCP server

1. Overview
Product Name

Shopify MCP Server

Mission

Provide a secure, standardized MCP server that allows AI systems, automation pipelines, and developer tools to safely interact with Shopify stores through structured tools.

The system exposes Shopify store data and safe mutation operations through MCP tools while maintaining strict access control.

Model Context Protocol servers act as a bridge between LLM systems and external services, allowing models to interact with APIs, databases, and tools through a standardized interface.

2. Objectives

Primary goals:

Enable any Shopify store owner or developer to connect their store via OAuth.

Provide complete Shopify operational access for:

products

orders

customers

inventory

Prevent dangerous or sensitive operations.

Offer token-efficient tool usage for LLM workflows.

Provide CLI access for developers.

Serve as an open-source Shopify AI infrastructure layer.

3. Target Users
Shopify Developers

Use MCP server for building AI agents, dashboards, automation.

Store Owners

Connect store and query data via AI.

AI Engineers

Connect LLM tools to Shopify.

Automation Engineers

Integrate Shopify workflows with LLM agents.

4. Core Use Cases
Use Case 1

AI agent asks:

"Which products are running low in stock?"

Flow:

AI → MCP tool → Shopify API → response

Use Case 2

Developer runs CLI:

mcp shopify orders --limit 20
Use Case 3

Automation workflow:

agent → shopify_mcp.find_orders
Use Case 4

Internal chatbot:

"What happened to order #1325?"
5. Non Goals

The system will NOT support:

billing operations

payouts

financial reports

payment processing

Shopify admin configuration

theme changes

store settings

These areas are excluded to maintain trust and safety.

6. Shopify API Foundation

The server will use:

Shopify Admin GraphQL API

The Admin API allows applications to access store resources such as products, orders, and customers and extend Shopify admin functionality.

REST API support may be optional but GraphQL is primary.

7. Authentication
OAuth Flow

Shopify apps connect stores through OAuth.

Process:

Developer registers Shopify app

Merchant installs app

OAuth redirect occurs

Shopify returns authorization code

Server exchanges code for access token

Shopify APIs require an access token obtained through OAuth or app installation to make authenticated API calls.

Stored Data

Each store connection saves:

shop_domain
access_token
scopes
installed_at
owner_email

Encrypted at rest.

8. Required API Scopes

Minimal scopes only:

read_products
write_products

read_orders
write_orders

read_customers
write_customers

read_inventory
write_inventory

read_locations

Scopes are explicitly requested during the app installation process.

9. System Architecture
Client (AI / CLI / Web App)
        │
        │
MCP Client
        │
        │
Shopify MCP Server
        │
        │
Shopify Admin GraphQL API
10. Components
MCP Server

Responsibilities:

expose tools

manage authentication

enforce permissions

query Shopify API

normalize responses

OAuth Service

Handles:

app installation

token exchange

store authorization

Tool Execution Layer

Executes:

tool → validation → shopify query → response
Store Connection Database

Stores:

shops
tokens
permissions
audit logs
11. MCP Tool Philosophy

Tools must be:

narrow

predictable

schema-validated

safe

MCP tools expose operations to LLMs through structured schemas that define their inputs and outputs.

12. Token Efficiency Strategy

Large MCP servers can consume excessive tokens because every tool definition is loaded in the context.

Solution:

Dynamic tool discovery via MCP CLI

Instead of loading all tools, CLI clients can fetch only required tools.

This avoids token bloat and reduces LLM context size.

13. CLI Support

Provide a built-in CLI:

shopify-mcp

Capabilities:

shopify-mcp connect
shopify-mcp products list
shopify-mcp orders get
shopify-mcp inventory low

CLI will:

dynamically fetch tools

reduce token usage

support automation

14. Tool Categories

Final MCP server should expose ~40 tools.

Grouped by domain.

15. Product Tools
Read
list_products
get_product
get_product_by_handle
search_products
list_product_variants
get_product_variant
list_collections
get_collection
Create
create_product
create_product_variant
create_collection
Update
update_product
update_product_variant
update_product_status
add_product_tags
remove_product_tags
16. Inventory Tools
Read
get_inventory_item
get_inventory_by_sku
list_inventory_levels
get_location_inventory
low_stock_report
Update
adjust_inventory
set_inventory_level
17. Order Tools
Read
list_orders
search_orders
get_order
get_order_by_name
get_order_timeline
get_order_fulfillment_status
Create
create_draft_order
add_order_note
add_order_tag
Update
update_order_tags
update_order_note
mark_order_paid
18. Customer Tools
Read
list_customers
search_customers
get_customer
get_customer_orders
get_customer_lifetime_value
Create
create_customer
Update
update_customer
add_customer_tag
remove_customer_tag
19. Analytics Tools

Safe store insights.

sales_summary
top_products
orders_by_date_range
refund_rate_summary
repeat_customer_rate
inventory_risk_report
20. Resources

Resources provide contextual store data.

Examples:

shopify://shop/info
shopify://shop/policies
shopify://shop/currencies
shopify://shop/locations
21. Prompt Templates (Optional)

Prompts help agents perform structured workflows.

Example prompts:

analyze_store_health
customer_support_summary
inventory_risk_analysis
daily_sales_report

Prompts guide LLM reasoning while tools perform actions.

22. Security Controls

Key rules:

Read-first architecture

Write tools optional.

Scope restrictions

Only minimal scopes.

Rate limiting

Prevent abuse.

Audit logs

Track every tool call.

Token encryption

All Shopify tokens encrypted.

23. Safety Strategy

Restrict tools affecting:

billing

payments

store configuration

This ensures MCP server is trusted by store owners.

24. Multi-Store Support

Each store registered:

shops table

Structure:

shop_id
domain
token
scope
installed_at
status
25. Rate Limits

Shopify API enforces request limits.

The MCP server must:

batch requests

paginate queries

cache responses

26. Observability

Metrics:

tool_usage
latency
shopify_errors
token_usage

Logs stored for debugging.

27. Deployment

Server supports:

local dev
docker
cloud deploy

Cloud targets:

Fly.io
Railway
AWS
GCP
28. SDK Support

Provide SDK examples for:

Node

Python

CLI

29. Open Source Strategy

Repository structure:

shopify-mcp/
 ├ server
 ├ cli
 ├ tools
 ├ shopify-client
 ├ auth
 ├ sdk
30. Future Features

Later additions:

webhook sync

vector search

automation engine

store health monitoring

multi-agent workflows

31. Risks

MCP systems can introduce security risks if tools expose sensitive capabilities or allow uncontrolled operations.

Mitigation:

strict tool permissions

approval workflows

safe defaults

32. Success Metrics

Key metrics:

GitHub stars

installs

connected stores

MCP tool calls

developer adoption

33. Launch Plan

Phase 1:

OAuth install

read tools

CLI

Phase 2:

mutation tools

analytics tools

Phase 3:

ecosystem integrations

34. Expected Outcome

A standard Shopify MCP layer usable by:

AI agents

chatbots

automation systems

developer tools

Final Thought

This project could realistically become the Shopify equivalent of Supabase MCP or Stripe MCP.

There is currently no widely adopted open-source Shopify MCP server.

If executed properly, this could become the default Shopify AI infrastructure layer.