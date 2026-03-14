import { config } from "dotenv";

config();

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
	console.error("Missing SHOPIFY_STORE_DOMAIN, SHOPIFY_CLIENT_ID, or SHOPIFY_CLIENT_SECRET in .env");
	process.exit(1);
}

const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
	method: "POST",
	headers: { "Content-Type": "application/x-www-form-urlencoded" },
	body: new URLSearchParams({
		grant_type: "client_credentials",
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
	}),
});

if (!response.ok) {
	console.error(`Token request failed: ${response.status} ${response.statusText}`);
	const text = await response.text();
	console.error(text);
	process.exit(1);
}

const { access_token, expires_in } = await response.json();
console.log("Access token obtained successfully!");
console.log(`Token: ${access_token}`);
console.log(`Expires in: ${Math.round(expires_in / 3600)} hours`);
console.log("\nAdd this to your .env:");
console.log(`SHOPIFY_ACCESS_TOKEN=${access_token}`);
