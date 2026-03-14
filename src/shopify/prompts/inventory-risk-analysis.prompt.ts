import { definePrompt } from "@core/helpers/define-prompt.js";

export const inventoryRiskAnalysisPrompt = definePrompt({
	name: "inventory-risk-analysis",
	description: "Generate an inventory risk assessment prompt",
	arguments: [
		{
			name: "domain",
			description: "The Shopify store domain to analyze",
			required: true,
		},
		{
			name: "threshold",
			description: "Low stock threshold quantity (default: 10)",
			required: false,
		},
	],
	async handler(args: Record<string, string>) {
		const { domain } = args;
		const threshold = args.threshold ?? "10";
		return [
			{
				role: "user" as const,
				content: {
					type: "text" as const,
					text: `Perform an inventory risk analysis for the Shopify store "${domain}" with a low-stock threshold of ${threshold} units. Assess:

1. **Out-of-Stock Items**: List all products and variants with zero inventory across all locations.
2. **Low-Stock Alerts**: Products and variants below the ${threshold}-unit threshold.
3. **Overstock Risk**: Items with unusually high inventory relative to their sales velocity.
4. **Location Imbalance**: Inventory distribution across locations, highlighting uneven distribution.
5. **Recommendations**: Suggest reorder priorities, redistribution actions, and items to consider discontinuing.

Use the available Shopify inventory and analytics tools to gather data and provide a prioritized action plan.`,
				},
			},
		];
	},
});
