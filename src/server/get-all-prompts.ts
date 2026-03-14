import type { PromptDefinition } from "@core/engine/prompt-types.js";
import {
	customerSupportSummaryPrompt,
	dailySalesReportPrompt,
	inventoryRiskAnalysisPrompt,
	storeHealthCheckPrompt,
} from "@shopify/prompts/index.js";

/**
 * Collects all PromptDefinition instances into a flat array.
 */
export function getAllPrompts(): PromptDefinition[] {
	return [storeHealthCheckPrompt, dailySalesReportPrompt, inventoryRiskAnalysisPrompt, customerSupportSummaryPrompt];
}
