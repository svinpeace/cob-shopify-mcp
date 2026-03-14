import http from "node:http";
import type pino from "pino";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { AuthProvider } from "./auth.interface.js";

const AUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class AuthorizationCodeProvider implements AuthProvider {
	type = "authorization-code" as const;

	constructor(
		private clientId: string,
		private clientSecret: string,
		private storage: StorageBackend,
		private logger: pino.Logger,
		private scopes: string[] = [
			"read_products",
			"write_products",
			"read_orders",
			"write_orders",
			"read_customers",
			"write_customers",
			"read_inventory",
			"write_inventory",
		],
		private callbackPort: number = 8787,
	) {}

	async getToken(storeDomain: string): Promise<string> {
		const stored = await this.storage.getToken(storeDomain);
		if (stored) return stored;
		throw new Error(
			`No token found for ${storeDomain}. Run 'cob-shopify-mcp connect --store ${storeDomain}' to authorize.`,
		);
	}

	getInstallUrl(storeDomain: string): string {
		const redirectUri = `http://localhost:${this.callbackPort}/callback`;
		const scopeStr = this.scopes.join(",");
		return `https://${storeDomain}/admin/oauth/authorize?client_id=${this.clientId}&scope=${scopeStr}&redirect_uri=${encodeURIComponent(redirectUri)}`;
	}

	async authorize(storeDomain: string): Promise<string> {
		const installUrl = this.getInstallUrl(storeDomain);

		this.logger.info({ storeDomain, installUrl }, "Starting OAuth authorization code flow");

		return new Promise<string>((resolve, reject) => {
			let settled = false;

			const server = http.createServer(async (req, res) => {
				if (!req.url?.startsWith("/callback")) {
					res.writeHead(404);
					res.end("Not found");
					return;
				}

				const url = new URL(req.url, `http://localhost:${this.callbackPort}`);
				const code = url.searchParams.get("code");

				if (!code) {
					res.writeHead(400);
					res.end("Missing authorization code");
					return;
				}

				try {
					// Exchange code for access token
					const tokenUrl = `https://${storeDomain}/admin/oauth/access_token`;
					const response = await fetch(tokenUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							client_id: this.clientId,
							client_secret: this.clientSecret,
							code,
						}),
					});

					if (!response.ok) {
						const body = await response.text();
						throw new Error(`Token exchange failed: HTTP ${response.status} — ${body}`);
					}

					const data = (await response.json()) as { access_token: string };
					const token = data.access_token;

					// Store token
					await this.storage.setToken(storeDomain, token, {
						createdAt: new Date().toISOString(),
						authMethod: "authorization-code",
					});

					res.writeHead(200, { "Content-Type": "text/html" });
					res.end("<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>");

					this.logger.info({ storeDomain }, "Authorization code flow completed successfully");

					settled = true;
					server.close();
					resolve(token);
				} catch (err) {
					res.writeHead(500);
					res.end("Token exchange failed");
					settled = true;
					server.close();
					reject(err);
				}
			});

			// Timeout after 5 minutes
			const timeout = setTimeout(() => {
				if (!settled) {
					settled = true;
					server.close();
					reject(new Error(`Authorization timed out after ${AUTH_TIMEOUT_MS / 1000}s. No callback received.`));
				}
			}, AUTH_TIMEOUT_MS);

			server.on("close", () => {
				clearTimeout(timeout);
			});

			server.listen(this.callbackPort, async () => {
				this.logger.info({ port: this.callbackPort }, "Callback server listening");

				// Open browser
				try {
					const openModule = await import("open");
					await openModule.default(installUrl);
				} catch {
					this.logger.warn("Could not open browser automatically. Please open this URL manually:");
					this.logger.warn(installUrl);
				}
			});
		});
	}

	async validate(storeDomain: string): Promise<boolean> {
		const token = await this.storage.getToken(storeDomain);
		return token !== null;
	}
}
