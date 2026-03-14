import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { markOrderPaid } from "./mark-order-paid.tool.js";

function makeCtx(queryFn = vi.fn()): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

describe("mark_order_paid", () => {
	it("has correct tool definition", () => {
		expect(markOrderPaid.name).toBe("mark_order_paid");
		expect(markOrderPaid.domain).toBe("orders");
		expect(markOrderPaid.tier).toBe(1);
		expect(markOrderPaid.scopes).toEqual(["write_orders"]);
	});

	it("calls orderMarkAsPaid mutation", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderMarkAsPaid: {
				order: { id: "gid://shopify/Order/1", name: "#1001", displayFinancialStatus: "PAID" },
				userErrors: [],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await markOrderPaid.handler?.({ id: "gid://shopify/Order/1" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), { input: { id: "gid://shopify/Order/1" } });
		expect(result.order.displayFinancialStatus).toBe("PAID");
	});

	it("returns errors when userErrors present", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderMarkAsPaid: {
				order: null,
				userErrors: [{ field: ["id"], message: "Order already paid" }],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await markOrderPaid.handler?.({ id: "gid://shopify/Order/1" }, ctx);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toBe("Order already paid");
	});
});
