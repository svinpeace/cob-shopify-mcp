/**
 * Derives a CLI action name from a tool name by stripping the domain portion.
 *
 * Algorithm:
 * 1. Compute singular form of domain (products→product, inventory→inventory, analytics→analytic)
 * 2. Try stripping `_<plural>` from end of tool name
 * 3. If not matched, try stripping `_<singular>` as first occurrence (preceded by `_`)
 * 4. Replace remaining `_` with `-`
 * 5. If result is empty, return the full tool name hyphenated
 */
export function deriveActionName(toolName: string, domain: string): string {
	const plural = domain;
	const singular = toSingular(domain);

	let result = toolName;

	// Step 2: try stripping _<plural> from end
	if (result.endsWith(`_${plural}`)) {
		result = result.slice(0, -(plural.length + 1));
	}
	// Step 3: try stripping _<singular>_ or _<singular>$ (first occurrence with _ prefix)
	else {
		const singularWithUnderscore = `_${singular}_`;
		const singularAtEnd = `_${singular}`;

		const idxMid = result.indexOf(singularWithUnderscore);
		if (idxMid !== -1) {
			// Strip _<singular> but keep the trailing underscore's content
			result = result.slice(0, idxMid) + result.slice(idxMid + singularWithUnderscore.length - 1);
		} else if (result.endsWith(singularAtEnd)) {
			result = result.slice(0, -(singular.length + 1));
		}
	}

	// Step 4: replace _ with -
	result = result.replace(/_/g, "-");

	// Step 5: if empty, return full tool name hyphenated
	if (!result) {
		return toolName.replace(/_/g, "-");
	}

	return result;
}

function toSingular(domain: string): string {
	// Special cases
	if (domain === "inventory") return "inventory";
	if (domain === "analytics") return "analytic";

	// General: strip trailing 's'
	if (domain.endsWith("s")) {
		return domain.slice(0, -1);
	}
	return domain;
}
