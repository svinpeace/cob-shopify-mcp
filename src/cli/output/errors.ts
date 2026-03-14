/**
 * Error and cost formatting for CLI output.
 */

export interface CostSummaryInput {
	totalCostConsumed: number;
	budgetRemaining: number;
	totalCallsMade: number;
}

/**
 * Format a cost summary line for display after command execution.
 *
 * @example
 * formatCostSummary({ totalCostConsumed: 28, budgetRemaining: 972, totalCallsMade: 3 })
 * // "Cost: 28 points | Budget: 972/1000 | Session: 3 calls"
 */
export function formatCostSummary(stats: CostSummaryInput): string {
	const budget = stats.budgetRemaining + stats.totalCostConsumed;
	return `Cost: ${stats.totalCostConsumed} points | Budget: ${stats.budgetRemaining}/${budget} | Session: ${stats.totalCallsMade} calls`;
}

/**
 * Format an error as a JSON object for consistent machine-readable output.
 */
export function formatError(message: string, code: string): string {
	return JSON.stringify({ error: { code, message } }, null, 2);
}
