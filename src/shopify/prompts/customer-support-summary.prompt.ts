import { definePrompt } from "@core/helpers/define-prompt.js";

export const customerSupportSummaryPrompt = definePrompt({
	name: "customer-support-summary",
	description: "Generate a customer support context summary for a specific customer",
	arguments: [
		{
			name: "customerId",
			description: "The Shopify customer ID to look up",
			required: true,
		},
		{
			name: "domain",
			description: "The Shopify store domain",
			required: true,
		},
	],
	async handler(args: Record<string, string>) {
		const { customerId, domain } = args;
		return [
			{
				role: "user" as const,
				content: {
					type: "text" as const,
					text: `Prepare a customer support context summary for customer ID "${customerId}" on the Shopify store "${domain}". Gather and present:

1. **Customer Profile**: Name, email, account creation date, tags, and notes.
2. **Order History**: All orders with dates, totals, fulfillment status, and payment status.
3. **Lifetime Value**: Total spend, order count, and average order value.
4. **Recent Activity**: Last order date, most recent interactions, and any open/unfulfilled orders.
5. **Support Context**: Any refunds, returns, or order notes that indicate previous support interactions.

Use the available Shopify customer and order tools to compile this information into a concise brief that a support agent can quickly review before engaging with the customer.`,
				},
			},
		];
	},
});
