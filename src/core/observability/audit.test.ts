import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import pino from "pino";
import { afterEach, describe, expect, it } from "vitest";
import { AuditLogger } from "./audit.js";
import type { AuditEntry } from "./types.js";

function makeSilentLogger(): pino.Logger {
	const dest = new Writable({
		write(_c, _e, cb) {
			cb();
		},
	});
	return pino({ level: "debug" }, dest);
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
	return {
		tool: "list_products",
		input: { limit: 10 },
		store: "test-store.myshopify.com",
		ts: new Date().toISOString(),
		duration_ms: 123,
		status: "success",
		...overrides,
	};
}

describe("AuditLogger", () => {
	const tempDir = join(tmpdir(), `cob-audit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	const auditFile = join(tempDir, "subdir", "audit.log");
	const cleanupFiles: AuditLogger[] = [];

	afterEach(async () => {
		for (const al of cleanupFiles) {
			await al.close();
		}
		cleanupFiles.length = 0;
	});

	it("creates directory if missing", async () => {
		const logger = makeSilentLogger();
		const audit = new AuditLogger(true, auditFile, logger);
		cleanupFiles.push(audit);

		// Should not throw even though directory doesn't exist
		await audit.initialize();
	});

	it("writes JSON line to audit file", async () => {
		const filePath = join(tempDir, "write-test", "audit.log");
		const logger = makeSilentLogger();
		const audit = new AuditLogger(true, filePath, logger);
		cleanupFiles.push(audit);

		await audit.initialize();
		await audit.log(makeEntry());

		const content = await readFile(filePath, "utf-8");
		const lines = content.trim().split("\n");
		expect(lines.length).toBe(1);

		const parsed = JSON.parse(lines[0]);
		expect(parsed.tool).toBe("list_products");
		expect(parsed.store).toBe("test-store.myshopify.com");
	});

	it("audit entry contains required fields (tool, input, ts, duration_ms, status)", async () => {
		const filePath = join(tempDir, "fields-test", "audit.log");
		const logger = makeSilentLogger();
		const audit = new AuditLogger(true, filePath, logger);
		cleanupFiles.push(audit);

		await audit.initialize();
		await audit.log(makeEntry());

		const content = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(content.trim());
		expect(parsed).toHaveProperty("tool");
		expect(parsed).toHaveProperty("input");
		expect(parsed).toHaveProperty("ts");
		expect(parsed).toHaveProperty("duration_ms");
		expect(parsed).toHaveProperty("status");
	});

	it("audit disabled when config is false (no file written)", async () => {
		const filePath = join(tempDir, "disabled-test", "audit.log");
		const logger = makeSilentLogger();
		const audit = new AuditLogger(false, filePath, logger);
		cleanupFiles.push(audit);

		await audit.initialize();
		await audit.log(makeEntry());

		// File should not exist since audit is disabled
		await expect(readFile(filePath, "utf-8")).rejects.toThrow();
	});

	it("audit entry includes cost data when provided", async () => {
		const filePath = join(tempDir, "cost-test", "audit.log");
		const logger = makeSilentLogger();
		const audit = new AuditLogger(true, filePath, logger);
		cleanupFiles.push(audit);

		await audit.initialize();
		await audit.log(
			makeEntry({
				cost: {
					requestedQueryCost: 101,
					actualQueryCost: 46,
					throttleStatus: {
						maximumAvailable: 1000,
						currentlyAvailable: 954,
						restoreRate: 50,
					},
				},
			}),
		);

		const content = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(content.trim());
		expect(parsed.cost).toBeDefined();
		expect(parsed.cost.actualQueryCost).toBe(46);
		expect(parsed.cost.throttleStatus.currentlyAvailable).toBe(954);
	});
});
