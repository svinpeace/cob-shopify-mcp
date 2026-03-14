import { describe, expect, it } from "vitest";
import { formatTable, maskSecret } from "./utils.js";

describe("maskSecret", () => {
	it("masks shpat_ tokens showing first 10 chars", () => {
		expect(maskSecret("shpat_abcdefghijklmnop")).toBe("shpat_abcd****");
	});

	it("masks generic secrets longer than 8 chars showing first 4", () => {
		expect(maskSecret("my-long-secret-key")).toBe("my-l****");
	});

	it("masks short secrets completely", () => {
		expect(maskSecret("short")).toBe("****");
	});

	it("masks exactly 8-char secrets completely", () => {
		expect(maskSecret("12345678")).toBe("****");
	});

	it("masks 9-char secrets showing first 4", () => {
		expect(maskSecret("123456789")).toBe("1234****");
	});
});

describe("formatTable", () => {
	it("produces aligned columns", () => {
		const result = formatTable(
			["Name", "Domain"],
			[
				["list-products", "products"],
				["get-order", "orders"],
			],
		);

		const lines = result.split("\n");
		expect(lines).toHaveLength(4); // header + separator + 2 rows
		expect(lines[0]).toContain("Name");
		expect(lines[0]).toContain("Domain");
		expect(lines[1]).toMatch(/^-+\s+-+$/);
		expect(lines[2]).toContain("list-products");
		expect(lines[3]).toContain("get-order");
	});

	it("handles empty rows", () => {
		const result = formatTable(["Name"], []);
		const lines = result.split("\n");
		// header + separator + empty body line
		expect(lines[0]).toContain("Name");
		expect(lines[1]).toMatch(/^-+$/);
	});

	it("pads columns correctly", () => {
		const result = formatTable(
			["A", "B"],
			[
				["short", "x"],
				["a-longer-value", "yy"],
			],
		);
		const lines = result.split("\n");
		// All lines should have consistent column positions
		const headerBPos = lines[0].indexOf("B");
		const row1BPos = lines[2].indexOf("x");
		const row2BPos = lines[3].indexOf("yy");
		expect(headerBPos).toBe(row1BPos);
		expect(headerBPos).toBe(row2BPos);
	});
});
