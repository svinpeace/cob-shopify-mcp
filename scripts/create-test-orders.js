import { config } from "dotenv";

config();

const STORE = process.env.SHOPIFY_STORE_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

// Get token
const tokenResp = await fetch(`https://${STORE}/admin/oauth/access_token`, {
	method: "POST",
	headers: { "Content-Type": "application/x-www-form-urlencoded" },
	body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
});
const { access_token } = await tokenResp.json();

async function gql(query, variables) {
	const r = await fetch(`https://${STORE}/admin/api/2026-01/graphql.json`, {
		method: "POST",
		headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": access_token },
		body: JSON.stringify({ query, variables }),
	});
	return r.json();
}

// Get products
const prodResult = await gql(
	`{ products(first: 20) { edges { node { id title variants(first: 5) { edges { node { id price } } } } } } }`,
);
const variants = [];
for (const e of prodResult.data.products.edges) {
	for (const v of e.node.variants.edges) {
		variants.push({ id: v.node.id, price: v.node.price, product: e.node.title });
	}
}
console.log(`Found ${variants.length} variants across ${prodResult.data.products.edges.length} products\n`);

const mutation = `mutation draftOrderCreate($input: DraftOrderInput!) {
  draftOrderCreate(input: $input) {
    draftOrder { id name totalPrice }
    userErrors { field message }
  }
}`;

const names = [
	"Raj",
	"Priya",
	"Amit",
	"Neha",
	"Vikram",
	"Ananya",
	"Karan",
	"Pooja",
	"Arjun",
	"Sneha",
	"Rohit",
	"Divya",
	"Aditya",
	"Meera",
	"Sanjay",
	"Kavita",
	"Nikhil",
	"Ritu",
	"Gaurav",
	"Simran",
	"Manish",
	"Nisha",
	"Deepak",
	"Swati",
	"Rahul",
	"Anjali",
	"Vishal",
	"Preeti",
	"Suresh",
	"Lakshmi",
	"Harish",
	"Shruti",
	"Varun",
	"Pallavi",
	"Manoj",
	"Tanya",
	"Sachin",
	"Sonam",
	"Ashish",
	"Megha",
	"Rajesh",
	"Komal",
	"Vivek",
	"Bhavna",
	"Ajay",
	"Rekha",
	"Kunal",
	"Jyoti",
	"Pankaj",
	"Smita",
];

let totalCost = 0;
let created = 0;
let errors = 0;

console.log("Creating 50 draft orders...\n");

for (let i = 0; i < 50; i++) {
	const numItems = Math.floor(Math.random() * 3) + 1;
	const lineItems = [];
	for (let j = 0; j < numItems; j++) {
		const v = variants[Math.floor(Math.random() * variants.length)];
		const qty = Math.floor(Math.random() * 3) + 1;
		lineItems.push({ variantId: v.id, quantity: qty });
	}

	const input = {
		lineItems,
		note: `Test order #${i + 1} for ${names[i]}`,
		tags: ["test-order", "batch-50"],
	};

	const result = await gql(mutation, { input });
	const cost = result.extensions?.cost;

	if (result.data?.draftOrderCreate?.draftOrder) {
		created++;
		const order = result.data.draftOrderCreate.draftOrder;
		totalCost += cost?.actualQueryCost ?? 0;

		if (i % 10 === 0 || i === 49) {
			console.log(
				`[${i + 1}/50] ${order.name} | $${order.totalPrice} | cost: ${cost?.actualQueryCost} pts | remaining: ${cost?.throttleStatus?.currentlyAvailable}/${cost?.throttleStatus?.maximumAvailable}`,
			);
		}
	} else {
		errors++;
		const err = result.data?.draftOrderCreate?.userErrors || result.errors;
		console.log(`[${i + 1}/50] ERROR: ${JSON.stringify(err)}`);
	}
}

// Final check
const check = await gql("{ shop { name } }");
const finalCost = check.extensions.cost;

console.log("\n=== FINAL REPORT ===");
console.log(`Orders created: ${created}`);
console.log(`Errors: ${errors}`);
console.log(`Total API cost: ${totalCost} points`);
console.log(`Average cost per order: ${(totalCost / created).toFixed(1)} points`);
console.log(`\n=== BUDGET STATUS ===`);
console.log(`Maximum available: ${finalCost.throttleStatus.maximumAvailable}`);
console.log(`Currently available: ${finalCost.throttleStatus.currentlyAvailable}`);
console.log(`Restore rate: ${finalCost.throttleStatus.restoreRate} pts/sec`);
