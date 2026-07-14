#!/usr/bin/env node
/**
 * http.ts
 * Alternative entry point: MCP server via Streamable HTTP.
 *
 * Useful when the MCP client doesn't support stdio or
 * when you want remote access to the server.
 *
 * Usage:
 *   node dist/http.js              (default port 3000)
 *   MCP_PORT=3001 node dist/http.js
 *
 * Configuração no opencode.json (HTTP):
 *   "mcp": {
 *     "mcp-searxng-local": {
 *       "type": "remote",
 *       "url": "http://localhost:3000/mcp",
 *       "enabled": true
 *     }
 *   }
 */

import { createServer } from 'node:http'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer as createMcpServer } from './server.js'
import type { ServerConfig } from './types.js'
import { randomUUID } from 'node:crypto'
import { warn } from './utils/logger.js'
import { checkSearxngHealth } from './server.js'

function loadConfigFromEnv(): ServerConfig {
  return {
    searxngHost: process.env.SEARXNG_HOST
      || process.env.MCP_SEARCH_LOCAL_SEARXNG_HOST
      || 'localhost',
    searxngPort: parseInt(
      process.env.SEARXNG_PORT
        || process.env.MCP_SEARCH_LOCAL_SEARXNG_PORT
        || '4000',
      10
    ),
    searxngTimeout: parseInt(
      process.env.SEARXNG_TIMEOUT
        || process.env.MCP_SEARCH_LOCAL_TIMEOUT
        || '10000',
      10
    ),
    debug: process.env.DEBUG === 'true'
      || process.env.MCP_SEARCH_LOCAL_DEBUG === 'true',
  }
}

async function main(): Promise<void> {
  const config = loadConfigFromEnv()
  const port = parseInt(process.env.MCP_PORT || '3000', 10)

  const healthy = await checkSearxngHealth(config)
  if (!healthy) {
    warn('⚠️  SearXNG is not responding. Run "docker compose up -d" first.')
  }

  const mcpServer = createMcpServer(config)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  })

  await mcpServer.connect(transport)

  const httpServer = createServer(async (req, res) => {
    // CORS for web clients
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', transport: 'streamable-http' }))
      return
    }

    // Read body for POST requests
    let body: unknown = undefined
    if (req.method === 'POST') {
      const chunks: Buffer[] = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const raw = Buffer.concat(chunks).toString()
      try {
        body = JSON.parse(raw)
      } catch {
        body = undefined
      }
    }

    try {
      await transport.handleRequest(req, res, body)
    } catch {
      if (!res.headersSent) {
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    }
  })

  httpServer.listen(port, () => {
    console.error(`[mcp-searxng-local] HTTP server listening on http://localhost:${port}/mcp`)
  })
}

main().catch((err) => {
  console.error('[mcp-searxng-local] Fatal:', err)
  process.exit(1)
})
