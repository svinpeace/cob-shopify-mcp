import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	cleanupIntegrationContext,
	createIntegrationContext,
	type IntegrationContext,
	skipIfNoCredentials,
} from "../../../test/integration-helpers.js";
import shopifyqlQuery from "./shopifyql-query.tool.js";

describe.skipIf(skipIfNoCredentials())("shopifyql_query", () => {
	let context: IntegrationContext;

	beforeAll(async () => {
		context = await createIntegrationContext();
		context.registry.register(shopifyqlQuery);
	});

	afterAll(async () => {
		await cleanupIntegrationContext(context);
	});

	it("has correct metadata", () => {
		expect(shopifyqlQuery.name).toBe("shopifyql_query");
		expect(shopifyqlQuery.domain).toBe("analytics");
		expect(shopifyqlQuery.tier).toBe(2);
		expect(shopifyqlQuery.scopes).toEqual(["read_reports"]);
		expect(shopifyqlQuery.handler).toBeDefined();
	});

	it("returns raw data and columns from a valid query", async () => {
		const result = await context.engine.execute(
			"shopifyql_query",
			{ query: "FROM sales SHOW total_sales SINCE 2024-01-01 UNTIL 2026-12-31" },
			context.ctx,
		);
		const data = result.data as any;
		expect(Array.isArray(data.data)).toBe(true);
		expect(Array.isArray(data.columns)).toBe(true);
	});

	it("rejects queries that do not start with FROM", async () => {
		await expect(
			context.engine.execute("shopifyql_query", { query: "SELECT * FROM sales" }, context.ctx),
		).rejects.toThrow("ShopifyQL query must start with FROM");
	});
});
