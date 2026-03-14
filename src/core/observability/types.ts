export interface ShopifyCostData {
	requestedQueryCost: number;
	actualQueryCost: number;
	throttleStatus: {
		maximumAvailable: number;
		currentlyAvailable: number;
		restoreRate: number;
	};
}

export interface SessionCostStats {
	totalCostConsumed: number;
	totalCallsMade: number;
	budgetRemaining: number;
	averageCostPerCall: number;
}

export interface CostSummary {
	_cost: ShopifyCostData;
	_session: SessionCostStats;
}

export interface AuditEntry {
	tool: string;
	input: Record<string, unknown>;
	store: string;
	ts: string;
	duration_ms: number;
	status: "success" | "error";
	cost?: ShopifyCostData;
	error?: string;
}
