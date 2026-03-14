import { describe, expect, it } from "vitest";
import { deriveActionName } from "./derive-action-name.js";

describe("deriveActionName", () => {
	describe("products domain", () => {
		const domain = "products";

		it("strips plural domain suffix: list_products → list", () => {
			expect(deriveActionName("list_products", domain)).toBe("list");
		});

		it("strips plural domain suffix: search_products → search", () => {
			expect(deriveActionName("search_products", domain)).toBe("search");
		});

		it("strips singular domain: get_product → get", () => {
			expect(deriveActionName("get_product", domain)).toBe("get");
		});

		it("strips singular domain: create_product → create", () => {
			expect(deriveActionName("create_product", domain)).toBe("create");
		});

		it("strips singular domain: update_product → update", () => {
			expect(deriveActionName("update_product", domain)).toBe("update");
		});

		it("strips singular from middle: get_product_by_handle → get-by-handle", () => {
			expect(deriveActionName("get_product_by_handle", domain)).toBe("get-by-handle");
		});

		it("strips singular from middle: get_product_variant → get-variant", () => {
			expect(deriveActionName("get_product_variant", domain)).toBe("get-variant");
		});

		it("strips singular from middle: list_product_variants → list-variants", () => {
			expect(deriveActionName("list_product_variants", domain)).toBe("list-variants");
		});

		it("strips singular from middle: create_product_variant → create-variant", () => {
			expect(deriveActionName("create_product_variant", domain)).toBe("create-variant");
		});

		it("strips singular from middle: update_product_variant → update-variant", () => {
			expect(deriveActionName("update_product_variant", domain)).toBe("update-variant");
		});

		it("strips singular from middle: update_product_status → update-status", () => {
			expect(deriveActionName("update_product_status", domain)).toBe("update-status");
		});

		it("strips singular from middle: manage_product_tags → manage-tags", () => {
			expect(deriveActionName("manage_product_tags", domain)).toBe("manage-tags");
		});

		it("no domain match: list_collections → list-collections", () => {
			expect(deriveActionName("list_collections", domain)).toBe("list-collections");
		});

		it("no domain match: get_collection → get-collection", () => {
			expect(deriveActionName("get_collection", domain)).toBe("get-collection");
		});

		it("no domain match: create_collection → create-collection", () => {
			expect(deriveActionName("create_collection", domain)).toBe("create-collection");
		});
	});

	describe("orders domain", () => {
		const domain = "orders";

		it("list_orders → list", () => {
			expect(deriveActionName("list_orders", domain)).toBe("list");
		});

		it("search_orders → search", () => {
			expect(deriveActionName("search_orders", domain)).toBe("search");
		});

		it("get_order → get", () => {
			expect(deriveActionName("get_order", domain)).toBe("get");
		});

		it("get_order_by_name → get-by-name", () => {
			expect(deriveActionName("get_order_by_name", domain)).toBe("get-by-name");
		});

		it("get_order_timeline → get-timeline", () => {
			expect(deriveActionName("get_order_timeline", domain)).toBe("get-timeline");
		});

		it("get_order_fulfillment_status → get-fulfillment-status", () => {
			expect(deriveActionName("get_order_fulfillment_status", domain)).toBe("get-fulfillment-status");
		});

		it("create_draft_order → create-draft", () => {
			expect(deriveActionName("create_draft_order", domain)).toBe("create-draft");
		});

		it("add_order_note → add-note", () => {
			expect(deriveActionName("add_order_note", domain)).toBe("add-note");
		});

		it("update_order_note → update-note", () => {
			expect(deriveActionName("update_order_note", domain)).toBe("update-note");
		});

		it("add_order_tag → add-tag", () => {
			expect(deriveActionName("add_order_tag", domain)).toBe("add-tag");
		});

		it("update_order_tags → update-tags", () => {
			expect(deriveActionName("update_order_tags", domain)).toBe("update-tags");
		});

		it("mark_order_paid → mark-paid", () => {
			expect(deriveActionName("mark_order_paid", domain)).toBe("mark-paid");
		});
	});

	describe("customers domain", () => {
		const domain = "customers";

		it("list_customers → list", () => {
			expect(deriveActionName("list_customers", domain)).toBe("list");
		});

		it("search_customers → search", () => {
			expect(deriveActionName("search_customers", domain)).toBe("search");
		});

		it("get_customer → get", () => {
			expect(deriveActionName("get_customer", domain)).toBe("get");
		});

		it("create_customer → create", () => {
			expect(deriveActionName("create_customer", domain)).toBe("create");
		});

		it("update_customer → update", () => {
			expect(deriveActionName("update_customer", domain)).toBe("update");
		});

		it("get_customer_orders → get-orders", () => {
			expect(deriveActionName("get_customer_orders", domain)).toBe("get-orders");
		});

		it("get_customer_lifetime_value → get-lifetime-value", () => {
			expect(deriveActionName("get_customer_lifetime_value", domain)).toBe("get-lifetime-value");
		});

		it("add_customer_tag → add-tag", () => {
			expect(deriveActionName("add_customer_tag", domain)).toBe("add-tag");
		});

		it("remove_customer_tag → remove-tag", () => {
			expect(deriveActionName("remove_customer_tag", domain)).toBe("remove-tag");
		});
	});

	describe("inventory domain", () => {
		const domain = "inventory";

		it("list_inventory_levels → list-levels", () => {
			expect(deriveActionName("list_inventory_levels", domain)).toBe("list-levels");
		});

		it("get_inventory_item → get-item", () => {
			expect(deriveActionName("get_inventory_item", domain)).toBe("get-item");
		});

		it("get_inventory_by_sku → get-by-sku", () => {
			expect(deriveActionName("get_inventory_by_sku", domain)).toBe("get-by-sku");
		});

		it("get_location_inventory → get-location", () => {
			expect(deriveActionName("get_location_inventory", domain)).toBe("get-location");
		});

		it("adjust_inventory → adjust", () => {
			expect(deriveActionName("adjust_inventory", domain)).toBe("adjust");
		});

		it("set_inventory_level → set-level", () => {
			expect(deriveActionName("set_inventory_level", domain)).toBe("set-level");
		});

		it("low_stock_report → low-stock-report", () => {
			expect(deriveActionName("low_stock_report", domain)).toBe("low-stock-report");
		});
	});

	describe("analytics domain", () => {
		const domain = "analytics";

		it("sales_summary → sales-summary", () => {
			expect(deriveActionName("sales_summary", domain)).toBe("sales-summary");
		});

		it("top_products → top-products", () => {
			expect(deriveActionName("top_products", domain)).toBe("top-products");
		});

		it("orders_by_date_range → orders-by-date-range", () => {
			expect(deriveActionName("orders_by_date_range", domain)).toBe("orders-by-date-range");
		});

		it("repeat_customer_rate → repeat-customer-rate", () => {
			expect(deriveActionName("repeat_customer_rate", domain)).toBe("repeat-customer-rate");
		});

		it("refund_rate_summary → refund-rate-summary", () => {
			expect(deriveActionName("refund_rate_summary", domain)).toBe("refund-rate-summary");
		});

		it("inventory_risk_report → inventory-risk-report", () => {
			expect(deriveActionName("inventory_risk_report", domain)).toBe("inventory-risk-report");
		});
	});

	describe("edge cases", () => {
		it("returns hyphenated tool name if result would be empty", () => {
			expect(deriveActionName("products", "products")).toBe("products");
		});

		it("handles tool name equal to singular domain", () => {
			expect(deriveActionName("product", "products")).toBe("product");
		});
	});
});
