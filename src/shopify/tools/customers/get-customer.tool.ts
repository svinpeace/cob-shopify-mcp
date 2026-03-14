import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import query from "./get-customer.graphql";

export const getCustomer = defineTool({
	name: "get_customer",
	domain: "customers",
	tier: 1,
	description: "Get a single customer by ID with full detail including addresses, note, state, and createdAt.",
	scopes: ["read_customers"],
	outputFields: [
		"id",
		"displayName",
		"firstName",
		"lastName",
		"email",
		"phone",
		"numberOfOrders",
		"amountSpent",
		"tags",
		"note",
		"state",
		"createdAt",
		"updatedAt",
		"defaultAddress",
		"addresses",
	],
	input: {
		id: z.string(),
	},
	handler: async (input: { id: string }, ctx: ExecutionContext) => {
		const result = await ctx.shopify.query(query, { id: input.id });
		const data = result.data ?? result;

		const c = data.customer;
		if (!c) return { customer: null };
		return {
			customer: {
				...c,
				email: c.defaultEmailAddress?.emailAddress ?? null,
				phone: c.defaultPhoneNumber?.phoneNumber ?? null,
				addresses: c.addressesV2 ?? c.addresses ?? null,
				defaultEmailAddress: undefined,
				defaultPhoneNumber: undefined,
				addressesV2: undefined,
			},
		};
	},
});
