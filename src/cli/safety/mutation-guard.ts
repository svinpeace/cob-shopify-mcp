/**
 * Mutation safety guard: confirmation prompt for write operations.
 *
 * Prevents accidental mutations by prompting the user before executing
 * tools that have write_* scopes.
 */

import { consola } from "consola";
import type { ToolDefinition } from "../../core/engine/types.js";

/**
 * Check if a tool is a mutation (has write_* scopes).
 */
export function isMutation(tool: ToolDefinition): boolean {
	return tool.scopes.some((s) => s.startsWith("write_"));
}

/**
 * Derive a human-readable action verb from the tool name.
 * e.g. "update_product" → "update", "delete_product" → "delete", "create_order" → "create"
 */
function deriveAction(toolName: string): string {
	const first = toolName.split("_")[0];
	return first || "modify";
}

/**
 * Prompt user for confirmation before executing a mutation.
 * Returns true if confirmed, false if aborted.
 *
 * Auto-confirms if:
 * - --yes flag is set
 * - stderr is not a TTY (piped/automated)
 */
export async function confirmMutation(tool: ToolDefinition, options: { yes?: boolean }): Promise<boolean> {
	// Auto-confirm: --yes flag
	if (options.yes) {
		return true;
	}

	// Auto-confirm: non-interactive (piped/CI)
	if (!process.stderr.isTTY) {
		return true;
	}

	const action = deriveAction(tool.name);
	const answer = await consola.prompt(`\u26A0 This will ${action} ${tool.domain}. Continue?`, {
		type: "text",
		placeholder: "y/N",
		initial: "",
	});

	// consola returns Symbol.for("cancel") on Ctrl+C
	if (typeof answer === "symbol") {
		return false;
	}

	const normalized = String(answer).trim().toLowerCase();
	return normalized === "y" || normalized === "yes";
}
