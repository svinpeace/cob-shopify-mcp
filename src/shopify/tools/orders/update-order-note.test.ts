import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { updateOrderNote } from "./update-order-note.tool.js";

function makeCtx(queryFn = vi.fn()): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

describe("update_order_note", () => {
	it("has correct tool definition", () => {
		expect(updateOrderNote.name).toBe("update_order_note");
		expect(updateOrderNote.domain).toBe("orders");
		expect(updateOrderNote.tier).toBe(1);
		expect(updateOrderNote.scopes).toEqual(["write_orders"]);
	});

	it("calls orderUpdate with note", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderUpdate: {
				order: { id: "gid://shopify/Order/1", name: "#1001", note: "Updated note" },
				userErrors: [],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await updateOrderNote.handler?.({ id: "gid://shopify/Order/1", note: "Updated note" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: { id: "gid://shopify/Order/1", note: "Updated note" },
		});
		expect(result.order.note).toBe("Updated note");
	});

	it("returns errors when userErrors present", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderUpdate: {
				order: null,
				userErrors: [{ field: ["note"], message: "Error" }],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await updateOrderNote.handler?.({ id: "gid://shopify/Order/1", note: "test" }, ctx);

		expect(result.errors).toHaveLength(1);
	});
});
