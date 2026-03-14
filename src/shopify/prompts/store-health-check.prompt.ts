import { definePrompt } from "@core/helpers/define-prompt.js";

export const storeHealthCheckPrompt = definePrompt({
	name: "store-health-check",
	description: "Generate a comprehensive store health analysis prompt",
	arguments: [
		{
			name: "domain",
			description: "The Shopify store domain to analyze",
			required: true,
		},
	],
	async handler(args: Record<string, string>) {
		const domain = args.domain;
		return [
			{
				role: "user" as const,
				content: {
					type: "text" as const,
					text: `Perform a comprehensive health check for the Shopify store "${domain}". Analyze the following areas:

1. **Product Catalog**: Check total product count, products without images, products without descriptions, draft products, and pricing issues.
2. **Inventory Health**: Identify out-of-stock items, low-stock items, and inventory tracking gaps.
3. **Order Trends**: Review recent order volume, fulfillment rates, and any order processing delays.
4. **Customer Metrics**: Analyze customer growth, repeat purchase rate, and customer lifetime value trends.
5. **Store Configuration**: Verify active locations, currency settings, and policy pages.

Use the available Shopify tools to gather data for each area and provide a structured report with actionable recommendations.`,
				},
			},
		];
	},
});
