import { defineCommand } from "citty";

export default defineCommand({
	meta: { name: "config", description: "Manage configuration" },
	subCommands: {
		show: () => import("./show.js").then((m) => m.default),
		validate: () => import("./validate.js").then((m) => m.default),
		init: () => import("./init.js").then((m) => m.default),
	},
});
