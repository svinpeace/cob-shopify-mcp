import { definePrompt } from "@core/helpers/define-prompt.js";

export const dailySalesReportPrompt = definePrompt({
	name: "daily-sales-report",
	description: "Generate a daily sales report prompt for a given date",
	arguments: [
		{
			name: "date",
			description: "The date to report on (YYYY-MM-DD format)",
			required: true,
		},
		{
			name: "domain",
			description: "The Shopify store domain",
			required: true,
		},
	],
	async handler(args: Record<string, string>) {
		const { date, domain } = args;
		return [
			{
				role: "user" as const,
				content: {
					type: "text" as const,
					text: `Generate a daily sales report for the Shopify store "${domain}" on ${date}. Include:

1. **Sales Summary**: Total revenue, number of orders, and average order value for the day.
2. **Top Products**: The best-selling products by quantity and revenue.
3. **Order Breakdown**: Orders by fulfillment status (unfulfilled, partially fulfilled, fulfilled).
4. **Comparison**: Compare today's performance against the previous day and the same day last week if possible.
5. **Notable Events**: Any unusually large orders, new customers, or refunds.

Use the available Shopify tools to gather this data and format it as a concise executive summary.`,
				},
			},
		];
	},
});
