export interface RetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
}

export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
	const maxRetries = options?.maxRetries ?? 3;
	const baseDelay = options?.baseDelayMs ?? 1000;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err: unknown) {
			if (attempt === maxRetries) throw err;

			const status =
				(err as Record<string, unknown>)?.status ??
				((err as Record<string, Record<string, unknown>>)?.response?.status as number | undefined);

			// Only retry on 429 and 5xx
			if (status !== undefined && status !== 429 && (status as number) < 500) throw err;

			// Respect Retry-After header
			const retryAfter = (
				err as { response?: { headers?: { get?(h: string): string | null } } }
			)?.response?.headers?.get?.("Retry-After");

			const delay = retryAfter ? Number(retryAfter) * 1000 : baseDelay * 2 ** attempt;

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	throw new Error("Unreachable");
}
