/**
 * logger.ts
 * Logging utility for MCP server debug.
 * When debug=false (production), logs are suppressed.
 */

let debugMode = false

export function setDebug(enabled: boolean): void {
  debugMode = enabled
}

export function log(...args: unknown[]): void {
  if (debugMode) {
    console.error('[mcp-searxng-local]', ...args)
  }
}

export function warn(...args: unknown[]): void {
  console.warn('[mcp-searxng-local]', ...args)
}

export function error(...args: unknown[]): void {
  console.error('[mcp-searxng-local]', ...args)
}
