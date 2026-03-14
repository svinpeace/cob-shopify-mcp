import { describe, expect, it } from "vitest";
import { CostTracker } from "./cost-tracker.js";
import type { ShopifyCostData } from "./types.js";

function makeCostData(overrides: Partial<ShopifyCostData> = {}): ShopifyCostData {
	return {
		requestedQueryCost: 100,
		actualQueryCost: 50,
		throttleStatus: {
			maximumAvailable: 1000,
			currentlyAvailable: 950,
			restoreRate: 50,
		},
		...overrides,
	};
}

describe("CostTracker", () => {
	it("fresh tracker has zero stats", () => {
		const tracker = new CostTracker();
		const stats = tracker.getSessionStats();
		expect(stats.totalCostConsumed).toBe(0);
		expect(stats.totalCallsMade).toBe(0);
		expect(stats.averageCostPerCall).toBe(0);
		expect(stats.budgetRemaining).toBe(0);
	});

	it("recordCall updates totalCostConsumed with actualQueryCost", () => {
		const tracker = new CostTracker();
		tracker.recordCall(makeCostData({ actualQueryCost: 42 }));
		expect(tracker.getSessionStats().totalCostConsumed).toBe(42);
	});

	it("recordCall increments totalCallsMade", () => {
		const tracker = new CostTracker();
		tracker.recordCall(makeCostData());
		tracker.recordCall(makeCostData());
		expect(tracker.getSessionStats().totalCallsMade).toBe(2);
	});

	it("getSessionStats returns correct averageCostPerCall", () => {
		const tracker = new CostTracker();
		tracker.recordCall(makeCostData({ actualQueryCost: 30 }));
		tracker.recordCall(makeCostData({ actualQueryCost: 70 }));
		expect(tracker.getSessionStats().averageCostPerCall).toBe(50);
	});

	it("budgetRemaining uses latest throttleStatus.currentlyAvailable", () => {
		const tracker = new CostTracker();
		tracker.recordCall(
			makeCostData({
				throttleStatus: { maximumAvailable: 1000, currentlyAvailable: 900, restoreRate: 50 },
			}),
		);
		tracker.recordCall(
			makeCostData({
				throttleStatus: { maximumAvailable: 1000, currentlyAvailable: 850, restoreRate: 50 },
			}),
		);
		expect(tracker.getSessionStats().budgetRemaining).toBe(850);
	});

	it("getCostSummary combines per-call cost + session stats", () => {
		const tracker = new CostTracker();
		const costData = makeCostData({ actualQueryCost: 46 });
		tracker.recordCall(costData);

		const summary = tracker.getCostSummary(costData);
		expect(summary._cost).toEqual(costData);
		expect(summary._session.totalCostConsumed).toBe(46);
		expect(summary._session.totalCallsMade).toBe(1);
		expect(summary._session.averageCostPerCall).toBe(46);
	});

	it("multiple calls accumulate correctly", () => {
		const tracker = new CostTracker();
		tracker.recordCall(makeCostData({ actualQueryCost: 10 }));
		tracker.recordCall(makeCostData({ actualQueryCost: 20 }));
		tracker.recordCall(makeCostData({ actualQueryCost: 30 }));

		const stats = tracker.getSessionStats();
		expect(stats.totalCostConsumed).toBe(60);
		expect(stats.totalCallsMade).toBe(3);
		expect(stats.averageCostPerCall).toBe(20);
	});
});
