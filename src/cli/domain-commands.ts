/**
 * Groups ToolDefinitions by domain into citty parent commands with subcommands.
 *
 * Each domain becomes a top-level CLI command (e.g. `cob-shopify products`)
 * with per-tool subcommands (e.g. `cob-shopify products list`).
 *
 * Built-in tools use pre-computed action names from the generated map
 * (created at build time by scripts/generate-cli-commands.ts).
 * Custom YAML tools fall back to runtime deriveActionName().
 */

import { defineCommand } from "citty";
import type { ToolDefinition } from "../core/engine/types.js";
import { deriveActionName } from "./converter/derive-action-name.js";
import { toolToCommand } from "./converter/tool-to-command.js";
import { getDomainDescription } from "./domain-descriptions.js";

/**
 * Pre-computed action name map loaded from build-time generated JSON.
 * Falls back to empty object if the file doesn't exist (first clone, CI without prebuild).
 */
let actionNameMap: Record<string, string> = {};
try {
	// @ts-ignore -- JSON import may not exist before first build
	const imported = await import("./generated/action-names.json", { with: { type: "json" } });
	actionNameMap = imported.default;
} catch {
	// Generated file not found — will use runtime deriveActionName() for all tools
}

/**
 * Resolve the CLI action name for a tool, using the pre-computed map when
 * available and falling back to runtime derivation for custom/unknown tools.
 */
function resolveActionName(toolName: string, domain: string): string {
	return actionNameMap[toolName] ?? deriveActionName(toolName, domain);
}

/**
 * Build citty parent commands for each domain, with tool subcommands.
 *
 * @param tools - The list of enabled tools to group by domain
 * @returns A record mapping domain name to citty command definition
 */
export function buildDomainCommands(tools: ToolDefinition[]): Record<string, ReturnType<typeof defineCommand>> {
	// Group tools by domain
	const domainMap = new Map<string, ToolDefinition[]>();
	for (const tool of tools) {
		const existing = domainMap.get(tool.domain);
		if (existing) {
			existing.push(tool);
		} else {
			domainMap.set(tool.domain, [tool]);
		}
	}

	// Build a citty parent command per domain
	const result: Record<string, ReturnType<typeof defineCommand>> = {};

	for (const [domain, domainTools] of domainMap) {
		// biome-ignore lint/suspicious/noExplicitAny: citty's generic arg types are too strict for dynamic command building
		const subCommands: Record<string, any> = {};

		for (const tool of domainTools) {
			const actionName = resolveActionName(tool.name, domain);
			subCommands[actionName] = toolToCommand(tool, actionName);
		}

		result[domain] = defineCommand({
			meta: {
				name: domain,
				description: getDomainDescription(domain),
			},
			subCommands,
		});
	}

	return result;
}
