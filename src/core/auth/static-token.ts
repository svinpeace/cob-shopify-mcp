import type { AuthProvider } from "./auth.interface.js";

export class StaticTokenProvider implements AuthProvider {
	type = "static" as const;

	constructor(private accessToken: string) {}

	async getToken(_storeDomain: string): Promise<string> {
		return this.accessToken;
	}

	async validate(_storeDomain: string): Promise<boolean> {
		return (
			(this.accessToken.startsWith("shpat_") || this.accessToken.startsWith("shpca_")) && this.accessToken.length > 10
		);
	}
}
