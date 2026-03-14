import type { ZodType } from "zod";

export interface CittyArgDef {
	type: "string" | "boolean";
	description?: string;
	required?: boolean;
	default?: unknown;
}

export interface JsonSchemaField {
	type: string;
	min?: number;
	max?: number;
	default?: unknown;
	enum?: string[];
	required: boolean;
}

/**
 * Converts a record of Zod schemas to citty argument definitions.
 * citty only supports "string" and "boolean" types — numbers become strings.
 */
export function zodToCittyArgs(input: Record<string, ZodType>): Record<string, CittyArgDef> {
	const result: Record<string, CittyArgDef> = {};

	for (const [key, schema] of Object.entries(input)) {
		result[key] = convertToCitty(schema);
	}

	return result;
}

/**
 * Serializes Zod schemas to JSON schema objects for --describe output.
 */
export function zodToJsonSchema(input: Record<string, ZodType>): Record<string, JsonSchemaField> {
	const result: Record<string, JsonSchemaField> = {};

	for (const [key, schema] of Object.entries(input)) {
		result[key] = convertToJsonSchema(schema);
	}

	return result;
}

function convertToCitty(schema: ZodType): CittyArgDef {
	// biome-ignore lint/suspicious/noExplicitAny: Zod internals require _def access
	const def = (schema as any)._def;
	const typeName: string = def.typeName;

	if (typeName === "ZodOptional") {
		const inner = convertToCitty(def.innerType);
		return { ...inner, required: false };
	}

	if (typeName === "ZodDefault") {
		const inner = convertToCitty(def.innerType);
		return { ...inner, required: false, default: def.defaultValue() };
	}

	const description = def.description as string | undefined;

	if (typeName === "ZodString") {
		return { type: "string", ...(description && { description }), required: true };
	}

	if (typeName === "ZodNumber") {
		return { type: "string", ...(description && { description }), required: true };
	}

	if (typeName === "ZodBoolean") {
		return { type: "boolean", ...(description && { description }), required: true };
	}

	if (typeName === "ZodEnum") {
		const values: string[] = def.values;
		const desc = description ? `${description} (${values.join(", ")})` : `One of: ${values.join(", ")}`;
		return { type: "string", description: desc, required: true };
	}

	// Fallback
	return { type: "string", ...(description && { description }), required: true };
}

function convertToJsonSchema(schema: ZodType): JsonSchemaField {
	// biome-ignore lint/suspicious/noExplicitAny: Zod internals require _def access
	const def = (schema as any)._def;
	const typeName: string = def.typeName;

	if (typeName === "ZodOptional") {
		const inner = convertToJsonSchema(def.innerType);
		return { ...inner, required: false };
	}

	if (typeName === "ZodDefault") {
		const inner = convertToJsonSchema(def.innerType);
		return { ...inner, required: false, default: def.defaultValue() };
	}

	if (typeName === "ZodString") {
		return { type: "string", required: true };
	}

	if (typeName === "ZodNumber") {
		const field: JsonSchemaField = { type: "number", required: true };
		if (def.checks) {
			for (const check of def.checks) {
				if (check.kind === "min") field.min = check.value;
				if (check.kind === "max") field.max = check.value;
			}
		}
		return field;
	}

	if (typeName === "ZodBoolean") {
		return { type: "boolean", required: true };
	}

	if (typeName === "ZodEnum") {
		return { type: "string", enum: [...def.values], required: true };
	}

	return { type: "string", required: true };
}
