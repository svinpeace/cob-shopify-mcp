export interface StoreEntry {
	domain: string;
	scopes: string[];
	installedAt: string;
	status: "active" | "inactive";
	ownerEmail?: string;
}

export interface TokenMetadata {
	createdAt: string;
	expiresAt?: string;
	authMethod: "token" | "client-credentials" | "authorization-code";
}
