/**
 * Lightweight jq-style filter using dot-notation path extraction.
 *
 * Supported syntax:
 * - `.`              identity
 * - `.field`         extract field
 * - `.field.sub`     nested field
 * - `.field[]`       iterate array elements
 * - `.field[].sub`   map over array, extract sub
 * - `.[0]`           array index
 * - `.field[0]`      field then array index
 */
export function applyJqFilter(data: unknown, expression: string): unknown {
	const trimmed = expression.trim();

	if (trimmed === ".") {
		return data;
	}

	const segments = parseExpression(trimmed);
	return evaluate(data, segments);
}

type Segment = { type: "field"; name: string } | { type: "iterate" } | { type: "index"; idx: number };

function parseExpression(expr: string): Segment[] {
	const segments: Segment[] = [];
	// Remove leading dot
	let rest = expr.startsWith(".") ? expr.slice(1) : expr;

	while (rest.length > 0) {
		// Array iteration: []
		if (rest.startsWith("[]")) {
			segments.push({ type: "iterate" });
			rest = rest.slice(2);
			if (rest.startsWith(".")) {
				rest = rest.slice(1);
			}
			continue;
		}

		// Array index: [N]
		const idxMatch = rest.match(/^\[(\d+)\]/);
		if (idxMatch) {
			segments.push({ type: "index", idx: Number.parseInt(idxMatch[1], 10) });
			rest = rest.slice(idxMatch[0].length);
			if (rest.startsWith(".")) {
				rest = rest.slice(1);
			}
			continue;
		}

		// Field name: up to next `.` or `[`
		const fieldMatch = rest.match(/^([^.[]+)/);
		if (fieldMatch) {
			segments.push({ type: "field", name: fieldMatch[1] });
			rest = rest.slice(fieldMatch[0].length);
			if (rest.startsWith(".")) {
				rest = rest.slice(1);
			}
			continue;
		}

		// Safety: skip unrecognized character
		rest = rest.slice(1);
	}

	return segments;
}

function evaluate(data: unknown, segments: Segment[]): unknown {
	if (segments.length === 0) {
		return data;
	}

	const [current, ...remaining] = segments;

	switch (current.type) {
		case "field": {
			if (data === null || data === undefined || typeof data !== "object") {
				return undefined;
			}
			const obj = data as Record<string, unknown>;
			return evaluate(obj[current.name], remaining);
		}

		case "iterate": {
			if (!Array.isArray(data)) {
				return undefined;
			}
			if (remaining.length === 0) {
				return data;
			}
			// Flatten when nested iterate produces arrays
			const results = data.map((item) => evaluate(item, remaining));
			return results.flat();
		}

		case "index": {
			if (!Array.isArray(data)) {
				return undefined;
			}
			return evaluate(data[current.idx], remaining);
		}

		default:
			return undefined;
	}
}
