import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { executeShopifyQL } from "@shopify/client/shopifyql-client.js";
import { z } from "zod";

export default defineTool({
	name: "traffic_analytics",
	domain: "analytics",
	tier: 1,
	description: "Session traffic analytics over time, grouped by day, week, or month",
	scopes: ["read_reports"],
	input: {
		start_date: z.string().describe("ISO 8601 date, e.g. 2026-01-01"),
		end_date: z.string().describe("ISO 8601 date, e.g. 2026-01-31"),
		group_by: z.enum(["day", "week", "month"]).default("day").describe("Time grouping for traffic data"),
	},
	handler: async (
		input: { start_date: string; end_date: string; group_by: "day" | "week" | "month" },
		ctx: ExecutionContext,
	) => {
		const query = `FROM sessions SHOW sessions TIMESERIES ${input.group_by} SINCE ${input.start_date} UNTIL ${input.end_date}`;
		const result = await executeShopifyQL(query, ctx);
		const periods = result.data.map((row) => ({
			period: (row.day ?? row.week ?? row.month ?? "") as string,
			sessions: (row.sessions as number) ?? 0,
		}));
		const totalSessions = periods.reduce((sum, p) => sum + p.sessions, 0);
		return { periods, groupBy: input.group_by, totalSessions };
	},
});
