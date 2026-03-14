import pino from "pino";

/**
 * Creates a pino logger that writes to stderr (fd 2).
 * stdout is reserved for MCP stdio protocol — NEVER write logs there.
 */
export function createLogger(module: string, level?: string): pino.Logger {
	const logger = pino(
		{
			level: level ?? "info",
		},
		pino.destination(2),
	);

	return logger.child({ module });
}
