/**
 * errors.ts
 * Centralized error handling for the MCP server.
 * Formats errors in the MCP-expected format: { content, isError: true }.
 */

import { error as logError } from './logger.js'

/**
 * Custom error for SearXNG connection failures.
 */
export class SearxngConnectionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'SearxngConnectionError'
  }
}

/**
 * Custom error for unexpected SearXNG responses.
 */
export class SearxngResponseError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'SearxngResponseError'
  }
}

/**
 * Custom error for web page fetch failures.
 */
export class FetchError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

/**
 * Converts any error into a properly formatted MCP response.
 * Claude interprets isError=true as a tool execution failure.
 */
export function formatErrorResponse(error: unknown): {
  content: Array<{ type: 'text'; text: string }>
  isError: true
} {
  if (error instanceof SearxngConnectionError) {
    logError(`SearXNG connection failed: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: '❌ SearXNG connection error. Check if Docker is running:\n'
          + '  docker compose up -d\n\n'
          + `Details: ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof SearxngResponseError) {
    logError(`SearXNG response error (${error.statusCode}): ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ SearXNG error (HTTP ${error.statusCode ?? '?'}): ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof FetchError) {
    logError(`Fetch failed for ${error.url}: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ Error accessing URL${error.url ? ` (${error.url})` : ''}: ${error.message}`
      }],
      isError: true,
    }
  }

  if (error instanceof Error) {
    logError(`Unexpected error: ${error.message}`)
    return {
      content: [{
        type: 'text',
        text: `❌ Unexpected error: ${error.message}`
      }],
      isError: true,
    }
  }

  return {
    content: [{
      type: 'text',
      text: '❌ Unknown error'
    }],
    isError: true,
  }
}
