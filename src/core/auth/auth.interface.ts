export interface AuthProvider {
	type: "static" | "client-credentials" | "authorization-code";
	getToken(storeDomain: string): Promise<string>;
	refresh?(storeDomain: string): Promise<string>;
	validate(storeDomain: string): Promise<boolean>;
}
