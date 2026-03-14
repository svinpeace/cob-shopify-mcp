import type { CostSummary, SessionCostStats, ShopifyCostData } from "./types.js";

export class CostTracker {
	private totalCostConsumed = 0;
	private totalCallsMade = 0;
	private latestBudgetRemaining = 0;

	recordCall(costData: ShopifyCostData): void {
		this.totalCostConsumed += costData.actualQueryCost;
		this.totalCallsMade += 1;
		this.latestBudgetRemaining = costData.throttleStatus.currentlyAvailable;
	}

	getSessionStats(): SessionCostStats {
		return {
			totalCostConsumed: this.totalCostConsumed,
			totalCallsMade: this.totalCallsMade,
			budgetRemaining: this.latestBudgetRemaining,
			averageCostPerCall: this.totalCallsMade > 0 ? this.totalCostConsumed / this.totalCallsMade : 0,
		};
	}

	getCostSummary(callCost: ShopifyCostData): CostSummary {
		return {
			_cost: callCost,
			_session: this.getSessionStats(),
		};
	}
}
