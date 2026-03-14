export interface AuthConfig {
	method: "token" | "client-credentials" | "authorization-code";
	store_domain: string;
	access_token?: string;
	client_id?: string;
	client_secret?: string;
}

export interface TokenInfo {
	token: string;
	expiresAt?: Date;
	scopes?: string[];
}
