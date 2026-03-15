import type { ExecutionContext } from "@core/engine/types.js";
import graphql from "./shopifyql.graphql";

export interface ShopifyQLColumn {
	name: string;
	dataType: string;
	displayName: string;
}

export interface ShopifyQLResult {
	data: Record<string, string | number | null>[];
	columns: ShopifyQLColumn[];
}

function coerceValue(value: string | null, dataType: string): string | number | null {
	if (value === null || value === undefined) {
		return null;
	}
	const upperType = dataType.toUpperCase();
	if (upperType === "MONEY" || upperType === "FLOAT" || upperType === "PERCENT") {
		const parsed = parseFloat(value);
		return Number.isNaN(parsed) ? null : parsed;
	}
	if (upperType === "INT") {
		const parsed = parseInt(value, 10);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return value;
}

export async function executeShopifyQL(query: string, ctx: ExecutionContext): Promise<ShopifyQLResult> {
	const response = await ctx.shopify.query(graphql, { query }, "analytics");
	const result = response.data?.shopifyqlQuery;

	if (!result) {
		throw new Error(`ShopifyQL query failed: no response data. Query: ${query}`);
	}

	// Check for parse errors
	if (result.parseErrors && Array.isArray(result.parseErrors) && result.parseErrors.length > 0) {
		const errorMessages = result.parseErrors
			.map((e: { code?: string; message?: string }) => `[${e.code ?? "UNKNOWN"}] ${e.message ?? "Unknown error"}`)
			.join("; ");
		throw new Error(`ShopifyQL parse error: ${errorMessages}. Query: ${query}`);
	}

	const tableData = result.tableData;
	if (!tableData) {
		return { data: [], columns: [] };
	}

	const columns: ShopifyQLColumn[] = (tableData.columns ?? []).map(
		(col: { name: string; dataType: string; displayName: string }) => ({
			name: col.name,
			dataType: col.dataType,
			displayName: col.displayName,
		}),
	);

	const rows: Record<string, string | number | null>[] = (tableData.rows ?? []).map((row: (string | null)[]) => {
		const record: Record<string, string | number | null> = {};
		for (let i = 0; i < columns.length; i++) {
			record[columns[i].name] = coerceValue(row[i] ?? null, columns[i].dataType);
		}
		return record;
	});

	return { data: rows, columns };
}
