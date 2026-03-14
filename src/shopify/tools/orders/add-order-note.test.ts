import type { ExecutionContext } from "@core/engine/types.js";
import { describe, expect, it, vi } from "vitest";
import { addOrderNote } from "./add-order-note.tool.js";

function makeCtx(queryFn = vi.fn()): ExecutionContext {
	return {
		shopify: { query: queryFn },
		config: {} as any,
		storage: {} as any,
		logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() } as any,
		costTracker: {} as any,
	};
}

describe("add_order_note", () => {
	it("has correct tool definition", () => {
		expect(addOrderNote.name).toBe("add_order_note");
		expect(addOrderNote.domain).toBe("orders");
		expect(addOrderNote.tier).toBe(1);
		expect(addOrderNote.scopes).toEqual(["write_orders"]);
	});

	it("calls orderUpdate with note", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderUpdate: {
				order: { id: "gid://shopify/Order/1", name: "#1001", note: "Important note" },
				userErrors: [],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await addOrderNote.handler?.({ id: "gid://shopify/Order/1", note: "Important note" }, ctx);

		expect(queryFn).toHaveBeenCalledWith(expect.any(String), {
			input: { id: "gid://shopify/Order/1", note: "Important note" },
		});
		expect(result.order.note).toBe("Important note");
	});

	it("returns errors when userErrors present", async () => {
		const queryFn = vi.fn().mockResolvedValue({
			orderUpdate: {
				order: null,
				userErrors: [{ field: ["note"], message: "Note too long" }],
			},
		});
		const ctx = makeCtx(queryFn);

		const result = await addOrderNote.handler?.({ id: "gid://shopify/Order/1", note: "x".repeat(10000) }, ctx);

		expect(result.errors).toHaveLength(1);
	});
});
