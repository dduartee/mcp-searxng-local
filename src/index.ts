/**
 * index.ts
 * MCP server entry point.
 *
 * This file:
 * 1. Reads configuration from environment variables
 * 2. Creates the MCP server via createServer()
 * 3. Connects to the stdio transport (MCP default)
 *
 * stdio transport:
 *   The server reads JSON from stdin and writes JSON to stdout.
 *   Claude Code (or any MCP client) manages the process
 *   and communicates via pipe.
 *
 * To run:
 *   npm run dev    (development with hot reload)
 *   npm start      (production)
 *
 * To test with MCP Inspector:
 *   npm run inspector
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer, checkSearxngHealth } from './server.js'
import type { ServerConfig } from './types.js'
import { warn } from './utils/logger.js'

/**
 * Reads configuration from environment variables.
 * Supports SEARXNG_ and MCP_SEARCH_LOCAL_ prefixes for flexibility.
 */
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

/**
 * Main function.
 * Initializes everything and connects to the transport.
 */
async function main(): Promise<void> {
  const config = loadConfigFromEnv()

  // Check if SearXNG is running (non-critical — just warns)
  const healthy = await checkSearxngHealth(config)
  if (!healthy) {
    warn('⚠️  SearXNG is not responding at '
      + `http://${config.searxngHost}:${config.searxngPort}. `
      + 'Run "docker compose up -d" to start.')
    warn('MCP server will start, but web_search may fail until SearXNG is online.')
  }

  // Create and configure the server
  const server = createServer(config)

  // Connect to the stdio transport
  // StdioServerTransport reads from stdin and writes to stdout
  // Follows the MCP JSON-RPC protocol
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

// Start the server
// Catch unhandled errors for friendly message
main().catch((err) => {
  console.error('[mcp-searxng-local] Fatal:', err)
  process.exit(1)
})
