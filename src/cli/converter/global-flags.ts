/**
 * Global CLI flags available on every tool-derived command.
 */
export const globalFlags = {
	json: { type: "boolean" as const, description: "Output as JSON" },
	fields: {
		type: "string" as const,
		description: "Select specific response fields (comma-separated, implies --json)",
	},
	jq: {
		type: "string" as const,
		description: "Filter JSON output with jq expression (implies --json)",
	},
	describe: {
		type: "boolean" as const,
		description: "Show command schema as JSON, don't execute",
	},
	"dry-run": {
		type: "boolean" as const,
		description: "Preview mutations without executing",
	},
	yes: {
		type: "boolean" as const,
		description: "Skip confirmation prompts",
	},
};
