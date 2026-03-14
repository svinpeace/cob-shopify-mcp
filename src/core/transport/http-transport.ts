import crypto from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { TransportInstance } from "./types.js";

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks).toString()));
		req.on("error", reject);
	});
}

export class HttpTransport implements TransportInstance {
	private httpServer: Server | null = null;
	private transport: StreamableHTTPServerTransport | null = null;

	constructor(
		private port: number = 3000,
		private host: string = "0.0.0.0",
	) {}

	get address(): AddressInfo | null {
		if (!this.httpServer) return null;
		const addr = this.httpServer.address();
		if (typeof addr === "string" || addr === null) return null;
		return addr;
	}

	async start(server: McpServer): Promise<void> {
		this.transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => crypto.randomUUID(),
		});

		this.httpServer = createServer(async (req, res) => {
			// Health check endpoint
			if (req.method === "GET" && req.url === "/health") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ status: "ok" }));
				return;
			}

			// Handle DELETE for session termination
			if (req.method === "DELETE") {
				await this.transport?.handleRequest(req, res);
				return;
			}

			// Handle GET for SSE stream (server-sent events)
			if (req.method === "GET") {
				await this.transport?.handleRequest(req, res);
				return;
			}

			// POST — read and parse body, then pass to transport
			try {
				const rawBody = await readBody(req);
				let body: unknown;
				try {
					body = JSON.parse(rawBody);
				} catch {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }));
					return;
				}
				await this.transport?.handleRequest(req, res, body);
			} catch (err) {
				process.stderr.write(`MCP transport error: ${err instanceof Error ? err.stack : String(err)}\n`);
				if (!res.headersSent) {
					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null }));
				}
			}
		});

		await server.connect(this.transport);

		await new Promise<void>((resolve, reject) => {
			this.httpServer?.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE") {
					reject(new Error(`Port ${this.port} is already in use. Choose a different port with --port.`));
				} else {
					reject(err);
				}
			});
			this.httpServer?.listen(this.port, this.host, () => {
				const addr = this.httpServer?.address() as AddressInfo;
				process.stderr.write(`MCP server started on http://${addr.address}:${addr.port}\n`);
				resolve();
			});
		});
	}

	async stop(): Promise<void> {
		if (this.httpServer) {
			await new Promise<void>((resolve) => {
				this.httpServer?.close(() => resolve());
			});
		}
		if (this.transport) {
			await this.transport.close();
		}
	}
}
