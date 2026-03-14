import { describe, expect, it } from "vitest";
import { applyJqFilter } from "./jq-filter.js";

describe("applyJqFilter", () => {
	const data = {
		products: [
			{ id: "1", title: "Shirt", variants: [{ sku: "S-1" }, { sku: "S-2" }] },
			{ id: "2", title: "Pants", variants: [{ sku: "P-1" }] },
		],
		pageInfo: { hasNextPage: true },
	};

	it("extracts a top-level field with .field", () => {
		expect(applyJqFilter(data, ".pageInfo")).toEqual({ hasNextPage: true });
	});

	it("extracts nested field with .field.subfield", () => {
		expect(applyJqFilter(data, ".pageInfo.hasNextPage")).toBe(true);
	});

	it("extracts array elements with .field[]", () => {
		expect(applyJqFilter(data, ".products[]")).toEqual([
			{ id: "1", title: "Shirt", variants: [{ sku: "S-1" }, { sku: "S-2" }] },
			{ id: "2", title: "Pants", variants: [{ sku: "P-1" }] },
		]);
	});

	it("maps over array elements with .field[].subfield", () => {
		expect(applyJqFilter(data, ".products[].title")).toEqual(["Shirt", "Pants"]);
	});

	it("handles nested array mapping .field[].subfield[].leaf", () => {
		expect(applyJqFilter(data, ".products[].variants[].sku")).toEqual(["S-1", "S-2", "P-1"]);
	});

	it("returns identity for '.'", () => {
		expect(applyJqFilter(data, ".")).toEqual(data);
	});

	it("returns undefined for missing field", () => {
		expect(applyJqFilter(data, ".missing")).toBeUndefined();
	});

	it("handles simple array input with .[]", () => {
		const arr = [1, 2, 3];
		expect(applyJqFilter(arr, ".[]")).toEqual([1, 2, 3]);
	});

	it("handles array input with .[].field", () => {
		const arr = [{ name: "a" }, { name: "b" }];
		expect(applyJqFilter(arr, ".[].name")).toEqual(["a", "b"]);
	});

	it("returns null input as null", () => {
		expect(applyJqFilter(null, ".field")).toBeUndefined();
	});

	it("handles array index with .[0]", () => {
		const arr = [{ name: "first" }, { name: "second" }];
		expect(applyJqFilter(arr, ".[0]")).toEqual({ name: "first" });
	});

	it("handles field then array index with .field[0]", () => {
		expect(applyJqFilter(data, ".products[0]")).toEqual({
			id: "1",
			title: "Shirt",
			variants: [{ sku: "S-1" }, { sku: "S-2" }],
		});
	});
});
