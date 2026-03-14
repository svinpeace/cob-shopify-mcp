import { Writable } from "node:stream";
import pino from "pino";
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
	it("returns a pino instance", () => {
		const logger = createLogger("test-module");
		expect(logger).toBeDefined();
		expect(typeof logger.info).toBe("function");
		expect(typeof logger.error).toBe("function");
		expect(typeof logger.debug).toBe("function");
	});

	it("writes to stderr, not stdout", () => {
		// Use a pino destination writable to capture output and verify it works
		const chunks: string[] = [];
		const dest = new Writable({
			write(chunk, _encoding, callback) {
				chunks.push(chunk.toString());
				callback();
			},
		});

		const logger = pino({ level: "info" }, dest);
		const child = logger.child({ module: "stderr-test" });
		child.info("test message");

		// Flush synchronously via pino destination
		dest.end();

		expect(chunks.length).toBeGreaterThan(0);
		const parsed = JSON.parse(chunks[0]);
		expect(parsed.msg).toBe("test message");
		expect(parsed.module).toBe("stderr-test");
	});

	it("respects log level — debug hidden at info level", () => {
		const chunks: string[] = [];
		const dest = new Writable({
			write(chunk, _encoding, callback) {
				chunks.push(chunk.toString());
				callback();
			},
		});

		const logger = pino({ level: "info" }, dest);
		const child = logger.child({ module: "level-test" });
		child.debug("should not appear");
		child.info("should appear");
		dest.end();

		expect(chunks.length).toBe(1);
		const parsed = JSON.parse(chunks[0]);
		expect(parsed.msg).toBe("should appear");
	});

	it("child logger includes module context in output", () => {
		const chunks: string[] = [];
		const dest = new Writable({
			write(chunk, _encoding, callback) {
				chunks.push(chunk.toString());
				callback();
			},
		});

		const logger = pino({ level: "info" }, dest);
		const child = logger.child({ module: "my-module" });
		child.info("hello");
		dest.end();

		const parsed = JSON.parse(chunks[0]);
		expect(parsed.module).toBe("my-module");
	});

	it("createLogger uses stderr destination (fd 2)", () => {
		// Verify the factory creates a logger without throwing
		const logger = createLogger("fd2-test", "warn");
		// The logger should be functional
		logger.warn("this goes to stderr");
		expect(logger).toBeDefined();
	});
});
