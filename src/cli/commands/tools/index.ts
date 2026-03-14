import { defineCommand } from "citty";

export default defineCommand({
	meta: { name: "tools", description: "Inspect available tools" },
	subCommands: {
		list: () => import("./list.js").then((m) => m.default),
		info: () => import("./info.js").then((m) => m.default),
	},
});
