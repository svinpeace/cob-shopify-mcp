/**
 * Main output formatter — decides output format based on options and TTY status.
 *
 * Priority:
 * 1. fields → filter fields, output JSON
 * 2. jq → apply jq filter, output JSON
 * 3. json flag → JSON output
 * 4. TTY → table format
 * 5. Piped → JSON output
 */

import { filterFields } from "./field-filter.js";
import { applyJqFilter } from "./jq-filter.js";
import { dataToTable } from "./table.js";

export interface OutputOptions {
	json?: boolean;
	fields?: string;
	jq?: string;
}

export function formatOutput(data: unknown, options: OutputOptions): string {
	// fields takes highest precedence
	if (options.fields) {
		const fieldList = options.fields.split(",").map((f) => f.trim());
		const filtered = filterFields(data, fieldList);
		return JSON.stringify(filtered, null, 2);
	}

	// jq filter
	if (options.jq) {
		const result = applyJqFilter(data, options.jq);
		return JSON.stringify(result, null, 2);
	}

	// Explicit JSON flag
	if (options.json) {
		return JSON.stringify(data, null, 2);
	}

	// TTY → table, piped → JSON
	if (process.stdout.isTTY) {
		return dataToTable(data);
	}

	return JSON.stringify(data, null, 2);
}
