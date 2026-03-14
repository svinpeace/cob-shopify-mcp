/**
 * Enhanced table renderer for CLI output.
 * Builds on the concept of formatTable in cli/utils.ts but auto-detects
 * column structure from data.
 */

import { formatTable } from "../utils.js";

const MAX_CELL_WIDTH = 50;

/**
 * Convert arbitrary data to a formatted table string.
 *
 * - Array of objects: columns from first object's keys
 * - Single object: key-value pairs table
 * - Object with a nested array (e.g. {products: [...], pageInfo: {...}}):
 *   detect the array and table-ify it
 * - Primitives: returned as string representation
 */
export function dataToTable(data: unknown): string {
	if (data === null || data === undefined) {
		return String(data);
	}

	if (typeof data !== "object") {
		return String(data);
	}

	if (Array.isArray(data)) {
		return arrayToTable(data);
	}

	const obj = data as Record<string, unknown>;

	// Check for nested array property
	const arrayKey = findArrayProperty(obj);
	if (arrayKey !== undefined) {
		const arr = obj[arrayKey] as unknown[];
		return arrayToTable(arr);
	}

	// Single object: key-value pairs
	return objectToKeyValueTable(obj);
}

function arrayToTable(arr: unknown[]): string {
	if (arr.length === 0) {
		return "(empty)";
	}

	const first = arr[0];
	if (first === null || first === undefined || typeof first !== "object") {
		// Array of primitives
		const headers = ["Value"];
		const rows = arr.map((item) => [truncate(String(item ?? ""))]);
		return formatTable(headers, rows);
	}

	const headers = Object.keys(first as Record<string, unknown>);
	const rows = arr.map((item) => {
		const obj = (item ?? {}) as Record<string, unknown>;
		return headers.map((h) => truncate(formatCellValue(obj[h])));
	});

	return formatTable(headers, rows);
}

function objectToKeyValueTable(obj: Record<string, unknown>): string {
	const headers = ["Key", "Value"];
	const rows = Object.entries(obj).map(([key, value]) => [key, truncate(formatCellValue(value))]);
	return formatTable(headers, rows);
}

function formatCellValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

function truncate(str: string, maxWidth = MAX_CELL_WIDTH): string {
	if (str.length <= maxWidth) {
		return str;
	}
	return `${str.slice(0, maxWidth - 3)}...`;
}

/**
 * Find the first property that is an array in an object,
 * only when there is also at least one non-array property.
 */
function findArrayProperty(obj: Record<string, unknown>): string | undefined {
	let arrayKey: string | undefined;
	let hasNonArray = false;

	for (const key of Object.keys(obj)) {
		if (Array.isArray(obj[key])) {
			if (arrayKey === undefined) {
				arrayKey = key;
			}
		} else {
			hasNonArray = true;
		}
	}

	return hasNonArray ? arrayKey : undefined;
}
