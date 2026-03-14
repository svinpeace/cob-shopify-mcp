/**
 * Mask a secret value for safe display.
 * Shopify tokens (shpat_) show the first 10 chars, others show first 4.
 */
export function maskSecret(value: string): string {
	if (value.startsWith("shpat_")) {
		return `${value.slice(0, 10)}****`;
	}
	if (value.length > 8) {
		return `${value.slice(0, 4)}****`;
	}
	return "****";
}

/**
 * Format data as a simple aligned text table.
 */
export function formatTable(headers: string[], rows: string[][]): string {
	const widths = headers.map((h, i) => {
		const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? "").length), 0);
		return Math.max(h.length, maxRow);
	});

	const pad = (str: string, width: number) => str.padEnd(width);

	const headerLine = headers.map((h, i) => pad(h, widths[i])).join("  ");
	const separator = widths.map((w) => "-".repeat(w)).join("  ");
	const body = rows.map((row) => row.map((cell, i) => pad(cell, widths[i])).join("  ")).join("\n");

	return `${headerLine}\n${separator}\n${body}`;
}
