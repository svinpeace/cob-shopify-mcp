import type { ExecutionContext } from "@core/engine/types.js";
import { defineTool } from "@core/helpers/define-tool.js";
import { z } from "zod";
import mutation from "./update-customer.graphql";

export const updateCustomer = defineTool({
	name: "update_customer",
	domain: "customers",
	tier: 1,
	description: "Update customer fields such as name, email, phone, and note.",
	scopes: ["write_customers"],
	input: {
		id: z.string(),
		firstName: z.string().optional(),
		lastName: z.string().optional(),
		email: z.string().optional(),
		phone: z.string().optional(),
		note: z.string().optional(),
	},
	handler: async (
		input: {
			id: string;
			firstName?: string;
			lastName?: string;
			email?: string;
			phone?: string;
			note?: string;
		},
		ctx: ExecutionContext,
	) => {
		const customerInput: Record<string, unknown> = { id: input.id };
		if (input.firstName !== undefined) customerInput.firstName = input.firstName;
		if (input.lastName !== undefined) customerInput.lastName = input.lastName;
		if (input.email !== undefined) customerInput.email = input.email;
		if (input.phone !== undefined) customerInput.phone = input.phone;
		if (input.note !== undefined) customerInput.note = input.note;

		const result = await ctx.shopify.query(mutation, {
			input: customerInput,
		});
		const data = result.data ?? result;

		if (data.customerUpdate.userErrors.length > 0) {
			return {
				error: true,
				userErrors: data.customerUpdate.userErrors,
			};
		}

		const c = data.customerUpdate.customer;
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
