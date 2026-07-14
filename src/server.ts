/**
 * server.ts
 * Central MCP server configuration.
 *
 * Responsibilities:
 * 1. Create the McpServer instance (name, version, metadata)
 * 2. Register all tools (web_search, web_fetch)
 * 3. Expose resources (tool list, health check)
 * 4. Provide factory function to create the configured server
 *
 * Inspired by Exa MCP (src/mcp-handler.ts):
 *   initializeMcpServer(server, config) -> registers tools based on config
 *
 * The difference is that this server is simpler (2 tools vs Exa's 14),
 * so we don't need a toolRegistry with dynamic enabled/disabled.
 * But we kept the toolRegistry for consistency and extensibility.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ServerConfig } from './types.js'
import { registerWebSearchTool, registerWebSearchAdvancedTool } from './tools/webSearch.js'
import { registerWebFetchTool } from './tools/webFetch.js'
import { listToolMetadata } from './toolRegistry.js'
import { setDebug, log } from './utils/logger.js'
import { createSearxngClient } from './engines/searxng.js'

/**
 * Factory: creates and configures a complete MCP server.
 *
 * @param config  - Configuration (SearXNG port, debug, etc.)
 * @returns       - McpServer instance ready to connect
 */
export function createServer(config: ServerConfig = {}): McpServer {
  // Enable verbose logs if debug=true
  if (config.debug) {
    setDebug(true)
  }

  log('Creating MCP server...')
  log(`Config: ${JSON.stringify(config)}`)

  // Create the McpServer instance
  // The name is used by the MCP client to identify the server
  const server = new McpServer({
    name: 'mcp-searxng-local',
    version: '0.1.0',
  })

  // Register tools
  // Each tool becomes a "tool" in the MCP protocol, listable and callable
  log('Registering tools...')
  registerWebSearchTool(server, config)
  registerWebSearchAdvancedTool(server, config)
  registerWebFetchTool(server, config)
  log('Tools registered successfully')

  // Register a static resource with the tool list
  // Resources are data the server exposes for the client to read
  server.resource(
    'tools',
    'mcp-searxng-local://tools',
    {
      description: 'List of tools available on the server',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [{
        uri: 'mcp-searxng-local://tools',
        text: JSON.stringify(listToolMetadata(), null, 2),
        mimeType: 'application/json',
      }],
    })
  )

  return server
}

/**
 * Checks if SearXNG is accessible.
 * Called during startup to provide user feedback.
 */
export async function checkSearxngHealth(config: ServerConfig): Promise<boolean> {
  const client = createSearxngClient(config)
  const healthy = await client.healthCheck()
  return healthy
}
