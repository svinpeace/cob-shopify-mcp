import { defineCommand } from "citty";

export default defineCommand({
	meta: { name: "stores", description: "Manage connected stores" },
	subCommands: {
		list: () => import("./list.js").then((m) => m.default),
		remove: () => import("./remove.js").then((m) => m.default),
	},
});
