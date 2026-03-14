import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type pino from "pino";
import type { AuditEntry } from "./types.js";

export class AuditLogger {
	private readonly enabled: boolean;
	private readonly filePath: string;
	private readonly logger: pino.Logger;

	constructor(auditEnabled: boolean, auditFilePath: string, logger: pino.Logger) {
		this.enabled = auditEnabled;
		this.filePath = auditFilePath;
		this.logger = logger;
	}

	async initialize(): Promise<void> {
		if (!this.enabled) return;
		await mkdir(dirname(this.filePath), { recursive: true });
	}

	async log(entry: AuditEntry): Promise<void> {
		if (!this.enabled) return;

		const line = `${JSON.stringify(entry)}\n`;
		await appendFile(this.filePath, line, "utf-8");
		this.logger.debug({ audit: entry }, "audit log entry");
	}

	async close(): Promise<void> {
		// No-op for appendFile-based approach; included for interface completeness.
	}
}
