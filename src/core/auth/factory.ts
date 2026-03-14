import type pino from "pino";
import type { StorageBackend } from "../storage/storage.interface.js";
import type { AuthProvider } from "./auth.interface.js";
import { AuthorizationCodeProvider } from "./authorization-code.js";
import { ClientCredentialsProvider } from "./client-credentials.js";
import { StaticTokenProvider } from "./static-token.js";
import type { AuthConfig } from "./types.js";

export function createAuthProvider(config: AuthConfig, storage: StorageBackend, logger: pino.Logger): AuthProvider {
	// 1. If access_token is present → StaticTokenProvider
	if (config.access_token) {
		logger.info("Using static token authentication");
		return new StaticTokenProvider(config.access_token);
	}

	// 2. If client_id + client_secret + method is 'authorization-code' → AuthorizationCodeProvider
	if (config.client_id && config.client_secret && config.method === "authorization-code") {
		logger.info("Using authorization code authentication");
		return new AuthorizationCodeProvider(config.client_id, config.client_secret, storage, logger);
	}

	// 3. If client_id + client_secret → ClientCredentialsProvider (default for OAuth)
	if (config.client_id && config.client_secret) {
		logger.info("Using client credentials authentication");
		return new ClientCredentialsProvider(config.client_id, config.client_secret, storage, logger);
	}

	// 4. Otherwise throw clear error
	throw new Error(
		"No authentication credentials found. Provide SHOPIFY_ACCESS_TOKEN or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET",
	);
}
