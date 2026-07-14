import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ServerConfig } from '../types.js'
import { extractFromUrl } from '../engines/fetchHtml.js'
import { formatPageContent } from '../utils/formatter.js'
import { formatErrorResponse } from '../utils/errors.js'
import { log } from '../utils/logger.js'

const fetchParams = {
  url: z.string()
    .url()
    .describe('Full page URL to extract content from (ex: https://example.com)'),
  maxChars: z.number()
    .int().min(100).max(50000).default(5000)
    .describe('Maximum content characters (100-50000, default 5000)'),
  mode: z.enum(['text', 'highlights'])
    .default('text')
    .describe('Mode: "text" returns full page; "highlights" extracts relevant excerpts (requires query)'),
  query: z.string()
    .optional()
    .describe('Query to extract highlights — use the same query from web_search that led to this URL'),
} as const

export function registerWebFetchTool(
  server: McpServer,
  config: ServerConfig
): void {
  const fetchTimeout = 15000

  server.tool(
    'web_fetch',
    'Extracts page content as clean text. '
    + 'Supports two modes: "text" (full page, default) and "highlights" '
    + '(most relevant excerpts for a query, ~10x fewer tokens). '
    + 'Prefer "highlights" with a query for factual searches. '
    + 'Use "text" for deep analysis. '
    + 'Ideal for reading articles, documentation and blogs.',
    fetchParams,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      log(`web_fetch: url="${params.url}", mode=${params.mode}, maxChars=${params.maxChars}`)

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), fetchTimeout)

        try {
          const content = await extractFromUrl(params.url, controller.signal)

          return {
            content: [{
              type: 'text' as const,
              text: formatPageContent(
                params.url,
                content.title,
                content.description,
                content.text,
                params.maxChars,
                params.mode,
                params.query
              ),
            }],
          }
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return formatErrorResponse(new Error(`Timeout: page took more than ${fetchTimeout / 1000}s to respond`))
        }
        return formatErrorResponse(err)
      }
    }
  )
}
