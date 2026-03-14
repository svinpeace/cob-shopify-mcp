import { describe, expect, it } from "vitest";
import { formatOutput } from "./formatter.js";

describe("formatOutput", () => {
	it("returns pretty JSON when json option is true", () => {
		const data = { id: "1", title: "Shirt" };
		const result = formatOutput(data, { json: true });
		expect(result).toBe(JSON.stringify(data, null, 2));
	});

	it("applies field filter and returns JSON", () => {
		const data = { id: "1", title: "Shirt", price: "29.99" };
		const result = formatOutput(data, { fields: "id,title" });
		expect(JSON.parse(result)).toEqual({ id: "1", title: "Shirt" });
	});

	it("applies jq filter and returns JSON", () => {
		const data = {
			products: [
				{ id: "1", title: "Shirt" },
				{ id: "2", title: "Pants" },
			],
		};
		const result = formatOutput(data, { jq: ".products[].title" });
		expect(JSON.parse(result)).toEqual(["Shirt", "Pants"]);
	});

	it("returns JSON for non-TTY stdout (piped)", () => {
		// In test environment, process.stdout.isTTY is typically undefined
		const data = { id: "1" };
		const result = formatOutput(data, {});
		// Without TTY, should return JSON
		expect(result).toBe(JSON.stringify(data, null, 2));
	});

	it("formats array data as table when isTTY is true", () => {
		const originalIsTTY = process.stdout.isTTY;
		try {
			Object.defineProperty(process.stdout, "isTTY", {
				value: true,
				writable: true,
				configurable: true,
			});
			const data = [
				{ id: "1", title: "Shirt" },
				{ id: "2", title: "Pants" },
			];
			const result = formatOutput(data, {});
			expect(result).toContain("id");
			expect(result).toContain("title");
			expect(result).toContain("Shirt");
			expect(result).toContain("Pants");
			// Should have separator line
			expect(result).toContain("--");
		} finally {
			Object.defineProperty(process.stdout, "isTTY", {
				value: originalIsTTY,
				writable: true,
				configurable: true,
			});
		}
	});

	it("fields option takes precedence over jq", () => {
		const data = { id: "1", title: "Shirt", price: "29.99" };
		const result = formatOutput(data, { fields: "id", jq: ".title" });
		expect(JSON.parse(result)).toEqual({ id: "1" });
	});

	it("handles null data", () => {
		const result = formatOutput(null, { json: true });
		expect(result).toBe("null");
	});

	it("handles string data", () => {
		const result = formatOutput("hello", { json: true });
		expect(result).toBe('"hello"');
	});
});
