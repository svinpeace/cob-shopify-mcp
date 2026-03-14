import type { CobConfig } from "../config/types.js";
import type { ToolDefinition } from "../engine/types.js";

export class ToolRegistry {
	private tools = new Map<string, ToolDefinition>();

	register(tool: ToolDefinition): void {
		if (this.tools.has(tool.name)) {
			throw new Error(`Tool "${tool.name}" is already registered`);
		}
		this.tools.set(tool.name, tool);
	}

	get(name: string): ToolDefinition | undefined {
		return this.tools.get(name);
	}

	getAll(): ToolDefinition[] {
		return [...this.tools.values()];
	}

	getByDomain(domain: string): ToolDefinition[] {
		return this.getAll().filter((t) => t.domain === domain);
	}

	filter(config: CobConfig): ToolDefinition[] {
		return this.getAll().filter((tool) => {
			// 1. read_only excludes tools with write_ scopes
			if (config.tools.read_only) {
				const hasWriteScope = tool.scopes.some((s) => s.startsWith("write_"));
				if (hasWriteScope) return false;
			}

			// 2. disable list excludes
			if (config.tools.disable.includes(tool.name)) {
				return false;
			}

			// 3. enable list overrides tier default
			if (config.tools.enable.includes(tool.name)) {
				return true;
			}

			// 4. tier defaults: 1=on, 2=off, 3=on
			if (tool.tier === 2) return false;
			return true; // tier 1 and 3
		});
	}
}
