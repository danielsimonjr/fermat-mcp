#!/usr/bin/env bun
/**
 * Fermat MCP — TypeScript on Bun, MCP TypeScript SDK 2.0.
 *
 * Local clients (stdio):  bun run src/index.ts
 * HTTP / Smithery:        SMITHERY_DEPLOYMENT=1 bun run src/index.ts
 */

import {
  createMcpHandler,
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.ts";

const isHttp =
  Boolean(process.env.SMITHERY_DEPLOYMENT) ||
  process.env.MCP_TRANSPORT === "http" ||
  process.argv.includes("--http");

if (isHttp) {
  const port = Number(process.env.PORT ?? "8081");
  const host = process.env.HOST ?? "0.0.0.0";
  const handler = createMcpHandler(createServer);

  // Allow common local + container hosts; Smithery sets HOST/PORT.
  const allowedHosts = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    `[::1]`,
    `localhost:${port}`,
    `127.0.0.1:${port}`,
    `0.0.0.0:${port}`,
  ];
  const allowedOrigins = [
    "http://localhost",
    "http://127.0.0.1",
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    "null",
  ];

  Bun.serve({
    port,
    hostname: host,
    fetch(request) {
      // When bound to 0.0.0.0 for container deploy, Host headers vary —
      // skip strict local-only validation outside local binds.
      if (host === "127.0.0.1" || host === "localhost") {
        const rejected =
          hostHeaderValidationResponse(request, allowedHosts) ??
          originValidationResponse(request, allowedOrigins);
        if (rejected) return rejected;
      }
      return handler.fetch(request);
    },
  });

  console.error(`fmcp MCP server listening on http://${host}:${port}`);
} else {
  void serveStdio(createServer);
  console.error("fmcp MCP server running on stdio");
}
