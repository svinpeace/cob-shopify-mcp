import type pino from "pino";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { AuthProvider } from "./auth.interface.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_BUFFER_MS = 60 * 1000; // 60 seconds before expiry

export class ClientCredentialsProvider implements AuthProvider {
	type = "client-credentials" as const;
	private cachedToken: string | null = null;
	private expiresAt: Date | null = null;
	private refreshPromise: Promise<string> | null = null;

	constructor(
		private clientId: string,
		private clientSecret: string,
		private storage: StorageBackend,
		private logger: pino.Logger,
	) {}

	async getToken(storeDomain: string): Promise<string> {
		// Return cached token if valid and not near expiry
		if (this.cachedToken && this.expiresAt) {
			const now = new Date();
			const bufferTime = new Date(this.expiresAt.getTime() - REFRESH_BUFFER_MS);
			if (now < bufferTime) {
				return this.cachedToken;
			}
		}

		return this.refresh(storeDomain);
	}

	async refresh(storeDomain: string): Promise<string> {
		// Mutex: if a refresh is already in progress, wait for it
		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = this.performRefresh(storeDomain);

		try {
			const token = await this.refreshPromise;
			return token;
		} finally {
			this.refreshPromise = null;
		}
	}

	private async performRefresh(storeDomain: string): Promise<string> {
		this.logger.info({ storeDomain }, "Exchanging client credentials for access token");

		const url = `https://${storeDomain}/admin/oauth/access_token`;
		const body = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: this.clientId,
			client_secret: this.clientSecret,
		});
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		});

		if (!response.ok) {
			const body = await response.text();
			const message = `Client credentials token exchange failed: HTTP ${response.status} — ${body}`;
			this.logger.error({ storeDomain, status: response.status }, message);
			throw new Error(message);
		}

		const data = (await response.json()) as { access_token: string };
		const token = data.access_token;

		// Cache token with TTL
		this.cachedToken = token;
		this.expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

		// Persist via storage backend
		await this.storage.setToken(storeDomain, token, {
			createdAt: new Date().toISOString(),
			expiresAt: this.expiresAt.toISOString(),
			authMethod: "client-credentials",
		});

		this.logger.info({ storeDomain }, "Client credentials token obtained and cached");

		return token;
	}

	async validate(_storeDomain: string): Promise<boolean> {
		return !!(this.clientId && this.clientSecret);
	}
}
