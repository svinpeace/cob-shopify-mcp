import { consola } from "consola";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadConfig = vi.fn();
const mockResetConfig = vi.fn();

vi.mock("../../../core/config/loader.js", () => ({
	loadConfig: mockLoadConfig,
	_resetConfig: mockResetConfig,
}));

describe("config validate command", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.exitCode = undefined;
	});

	it("reports success when config is valid", async () => {
		mockLoadConfig.mockResolvedValue({
			auth: { method: "token", store_domain: "" },
			tools: { read_only: false, disable: [], enable: [], custom_paths: [] },
		});

		const successSpy = vi.spyOn(consola, "success").mockImplementation(() => {});
		const { default: validateCmd } = await import("./validate.js");

		await validateCmd.run?.({
			args: {},
			rawArgs: [],
			cmd: validateCmd,
		} as any);

		expect(mockResetConfig).toHaveBeenCalled();
		expect(mockLoadConfig).toHaveBeenCalled();
		expect(successSpy).toHaveBeenCalledWith("Configuration is valid.");
		expect(process.exitCode).toBeUndefined();

		successSpy.mockRestore();
	});

	it("reports failure when config is invalid", async () => {
		mockLoadConfig.mockRejectedValue(new Error("Invalid auth.method"));

		const errorSpy = vi.spyOn(consola, "error").mockImplementation(() => {});
		const { default: validateCmd } = await import("./validate.js");

		await validateCmd.run?.({
			args: {},
			rawArgs: [],
			cmd: validateCmd,
		} as any);

		expect(errorSpy).toHaveBeenCalledWith("Configuration validation failed:", "Invalid auth.method");
		expect(process.exitCode).toBe(1);

		errorSpy.mockRestore();
	});
});
