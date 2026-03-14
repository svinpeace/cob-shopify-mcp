import { defineCommand } from "citty";

export default defineCommand({
	meta: { name: "tools", description: "List, inspect, and run tools" },
	subCommands: {
		list: () => import("./list.js").then((m) => m.default),
		info: () => import("./info.js").then((m) => m.default),
		run: () => import("./run.js").then((m) => m.default),
	},
});
