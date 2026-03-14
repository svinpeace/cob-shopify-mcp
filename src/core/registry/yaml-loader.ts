import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { type ZodType, z } from "zod";
import type { ToolDefinition } from "../engine/types.js";

interface YamlInputField {
	type: string;
	description?: string;
	required?: boolean;
	min?: number;
	max?: number;
	default?: unknown;
	enum?: string[];
}

interface YamlToolDef {
	name?: string;
	domain?: string;
	description?: string;
	scopes?: string[];
	input?: Record<string, YamlInputField>;
	graphql?: string;
	response?: { mapping?: string };
}

function convertInputType(field: YamlInputField): ZodType {
	let schema: ZodType;

	switch (field.type) {
		case "string":
			schema = z.string();
			break;
		case "number": {
			let numSchema = z.number();
			if (field.min !== undefined) numSchema = numSchema.min(field.min);
			if (field.max !== undefined) numSchema = numSchema.max(field.max);
			schema = numSchema;
			break;
		}
		case "boolean":
			schema = z.boolean();
			break;
		case "enum":
			if (!field.enum || field.enum.length === 0) {
				throw new Error("Enum type requires an 'enum' array");
			}
			schema = z.enum(field.enum as [string, ...string[]]);
			break;
		default:
			schema = z.string();
	}

	if (!field.required && field.default === undefined) {
		schema = schema.optional() as unknown as ZodType;
	}

	if (field.default !== undefined) {
		schema = schema.default(field.default) as unknown as ZodType;
	}

	return schema;
}

function parseYamlTool(content: string, filePath: string): ToolDefinition {
	const raw = parseYaml(content) as YamlToolDef;

	if (!raw.name) {
		throw new Error(`YAML tool at "${filePath}" is missing required field: name`);
	}
	if (!raw.graphql) {
		throw new Error(`YAML tool "${raw.name}" at "${filePath}" is missing required field: graphql`);
	}
	if (!raw.domain) {
		throw new Error(`YAML tool "${raw.name}" at "${filePath}" is missing required field: domain`);
	}
	if (!raw.description) {
		throw new Error(`YAML tool "${raw.name}" at "${filePath}" is missing required field: description`);
	}

	const input: Record<string, ZodType> = {};
	if (raw.input) {
		for (const [key, field] of Object.entries(raw.input)) {
			input[key] = convertInputType(field);
		}
	}

	const tool: ToolDefinition = {
		name: raw.name,
		domain: raw.domain,
		tier: 3,
		description: raw.description,
		scopes: raw.scopes ?? [],
		input,
		graphql: raw.graphql,
	};

	if (raw.response?.mapping) {
		const mapping = raw.response.mapping;
		tool.response = (data: any) => {
			const parts = mapping.split(".");
			let result = data;
			for (const part of parts) {
				result = result?.[part];
			}
			return result;
		};
	}

	return tool;
}

export function loadYamlTools(paths: string[]): ToolDefinition[] {
	const tools: ToolDefinition[] = [];

	for (const p of paths) {
		try {
			const stat = statSync(p);
			if (stat.isDirectory()) {
				const files = readdirSync(p).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
				for (const file of files) {
					const filePath = join(p, file);
					const content = readFileSync(filePath, "utf-8");
					tools.push(parseYamlTool(content, filePath));
				}
			} else {
				const content = readFileSync(p, "utf-8");
				tools.push(parseYamlTool(content, p));
			}
		} catch (err) {
			if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
				continue; // skip missing paths
			}
			throw err;
		}
	}

	return tools;
}
