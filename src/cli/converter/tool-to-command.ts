/**
 * Core converter: transforms a ToolDefinition into a citty CLI command.
 *
 * This is the glue between the tool engine and the CLI surface.
 * Each tool becomes a fully functional CLI command with proper arg parsing,
 * type coercion, output formatting, and error handling.
 */

import { defineCommand } from "citty";
import type { ZodType } from "zod";
import type { ToolDefinition } from "../../core/engine/types.js";
import { formatCostSummary, formatError } from "../output/errors.js";
import { formatOutput } from "../output/formatter.js";
import { globalFlags } from "./global-flags.js";
import { zodToCittyArgs, zodToJsonSchema } from "./zod-to-citty.js";

/**
 * Coerce a string value from citty into the proper type expected by the Zod schema.
 *
 * citty parses all non-boolean args as strings, but Zod expects numbers, booleans, etc.
 */
export function coerceValue(value: unknown, schema: ZodType): unknown {
	if (value === undefined || value === null) {
		return value;
	}

	// biome-ignore lint/suspicious/noExplicitAny: Zod internals require _def access
	const def = (schema as any)._def;
	const typeName: string = def.typeName;

	if (typeName === "ZodOptional" || typeName === "ZodDefault") {
		return coerceValue(value, def.innerType);
	}

	if (typeName === "ZodNumber") {
		return Number(value);
	}

	if (typeName === "ZodBoolean") {
		if (typeof value === "boolean") return value;
		return value === "true";
	}

	// ZodString, ZodEnum, and fallback — pass through
	return value;
}

/**
 * Coerce all input values from citty string types to the types expected by the tool's Zod schema.
 */
export function coerceInput(
	raw: Record<string, unknown>,
	inputSchema: Record<string, ZodType>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(raw)) {
		if (value === undefined) continue;
		const schema = inputSchema[key];
		if (!schema) {
			// Pass through unknown keys (shouldn't happen, but be safe)
			result[key] = value;
			continue;
		}
		result[key] = coerceValue(value, schema);
	}

	return result;
}

/**
 * Converts a ToolDefinition into a citty command definition.
 *
 * @param tool - The tool definition to convert
 * @param actionName - The derived CLI action name (e.g. "list" from "list_products")
 */
export function toolToCommand(tool: ToolDefinition, actionName: string) {
	const toolArgs = zodToCittyArgs(tool.input);

	return defineCommand({
		meta: {
			name: actionName,
			description: tool.description,
		},
		args: {
			...toolArgs,
			...globalFlags,
		},
		async run({ args }) {
			try {
				// --describe: show schema, don't execute
				if (args.describe) {
					const schema = zodToJsonSchema(tool.input);
					const output = JSON.stringify(
						{
							name: tool.name,
							domain: tool.domain,
							tier: tool.tier,
							description: tool.description,
							scopes: tool.scopes,
							input: schema,
						},
						null,
						2,
					);
					process.stdout.write(`${output}\n`);
					return;
				}

				// Extract tool input from parsed args (exclude global flags)
				const toolInput: Record<string, unknown> = {};
				for (const key of Object.keys(tool.input)) {
					if (args[key] !== undefined) {
						toolInput[key] = args[key];
					}
				}

				// Coerce types from CLI strings to proper types
				const coercedInput = coerceInput(toolInput, tool.input);

				// --dry-run: validate and show intent, don't execute
				if (args["dry-run"]) {
					const output = JSON.stringify(
						{
							dryRun: true,
							tool: tool.name,
							domain: tool.domain,
							input: coercedInput,
						},
						null,
						2,
					);
					process.stdout.write(`${output}\n`);
					return;
				}

				// Boot execution context (lazy — only when actually executing)
				const { createExecutionContext } = await import("./execution-context.js");
				const { ctx, engine } = await createExecutionContext();

				// Execute the tool
				const result = await engine.execute(tool.name, coercedInput, ctx);

				// Format output (respecting --json, --fields, --jq flags)
				const output = formatOutput(result.data, {
					json: args.json,
					fields: args.fields,
					jq: args.jq,
				});
				process.stdout.write(`${output}\n`);

				// Write cost summary to stderr
				const stats = ctx.costTracker.getSessionStats();
				if (stats.totalCallsMade > 0) {
					const costLine = formatCostSummary(stats);
					process.stderr.write(`${costLine}\n`);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				process.stderr.write(`${formatError(message, "EXECUTION_ERROR")}\n`);
				process.exitCode = 1;
			}
		},
	});
}
