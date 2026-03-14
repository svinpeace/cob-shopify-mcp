import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./create-customer.graphql";

export const createCustomer = defineTool({
	name: "create_customer",
	domain: "customers",
	tier: 1,
	description: "Create a new customer with firstName, lastName, email, phone, tags, and note.",
	scopes: ["write_customers"],
	input: {
		firstName: z.string(),
		lastName: z.string().optional(),
		email: z.string().optional(),
		phone: z.string().optional(),
		tags: z.array(z.string()).optional(),
		note: z.string().optional(),
	},
	handler: async (
		input: {
			firstName: string;
			lastName?: string;
			email?: string;
			phone?: string;
			tags?: string[];
			note?: string;
		},
		ctx: ExecutionContext,
	) => {
		const customerInput: Record<string, unknown> = {
			firstName: input.firstName,
		};
		if (input.lastName !== undefined) customerInput.lastName = input.lastName;
		if (input.email !== undefined) customerInput.email = input.email;
		if (input.phone !== undefined) customerInput.phone = input.phone;
		if (input.tags !== undefined) customerInput.tags = input.tags;
		if (input.note !== undefined) customerInput.note = input.note;

		const result = await ctx.shopify.query(mutation, {
			input: customerInput,
		});
		const data = result.data ?? result;

		if (data.customerCreate.userErrors.length > 0) {
			return {
				error: true,
				userErrors: data.customerCreate.userErrors,
			};
		}

		const c = data.customerCreate.customer;
		return {
			customer: {
				...c,
				email: c.defaultEmailAddress?.emailAddress ?? null,
				phone: c.defaultPhoneNumber?.phoneNumber ?? null,
				defaultEmailAddress: undefined,
				defaultPhoneNumber: undefined,
			},
		};
	},
});
