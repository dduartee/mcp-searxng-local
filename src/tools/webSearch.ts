import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ServerConfig, SearxngSearchParams } from '../types.js'
import { createSearxngClient } from '../engines/searxng.js'
import { formatFullSearchResponse } from '../utils/formatter.js'
import { formatErrorResponse } from '../utils/errors.js'
import { log } from '../utils/logger.js'

const searchParams = {
  query: z.string()
    .min(1)
    .describe('Search term. Ex: "latest artificial intelligence news 2026"'),
  count: z.number()
    .int().min(1).max(50).default(10)
    .describe('Number of results (1-50, default 10)'),
  pageno: z.number()
    .int().min(1).default(1)
    .describe('Results page (default 1)'),
  categories: z.enum(['general', 'news', 'images', 'files', 'video', 'music'])
    .optional()
    .describe('Categoria: general, news, images, files, video, music'),
  time_range: z.enum(['day', 'month', 'year'])
    .optional()
    .describe('Time filter: day, month, or year'),
  language: z.string()
    .optional()
    .describe('Language code: pt-BR, en-US, etc.'),
  includeDomains: z.array(z.string())
    .optional()
    .describe('Only results from these domains (ex: ["github.com", "wikipedia.org"])'),
  excludeDomains: z.array(z.string())
    .optional()
    .describe('Exclude results from these domains (ex: ["pinterest.com"])'),
  engines: z.string()
    .optional()
    .describe('Select engines: google, duckduckgo, brave, wikipedia, arxiv (comma-separated)'),
  safesearch: z.number()
    .int().min(0).max(2)
    .optional()
    .describe('Safe search: 0=off, 1=moderate, 2=strict'),
  startPublishedDate: z.string()
    .optional()
    .describe('ISO date: "2024-01-01" — filter results published after this date (client-side)'),
  endPublishedDate: z.string()
    .optional()
    .describe('ISO date: "2024-12-31" — filter results published before this date (client-side)'),
} as const

function filterByDomains(url: string, include?: string[], exclude?: string[]): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    if (exclude?.some((d) => hostname.includes(d.replace(/^www\./, '')))) return false
    if (include?.length && !include.some((d) => hostname.includes(d.replace(/^www\./, '')))) return false
    return true
  } catch {
    return include && include.length > 0 ? false : true
  }
}

function filterByDate(
  publishedDate: string | null | undefined,
  start?: string,
  end?: string
): boolean {
  if (!start && !end) return true
  if (!publishedDate) return false // no date = exclude when date filter is active
  const d = new Date(publishedDate).getTime()
  if (isNaN(d)) return false
  if (start && d < new Date(start).getTime()) return false
  if (end && d > new Date(end).getTime()) return false
  return true
}

function registerSearchTool(
  server: McpServer,
  config: ServerConfig,
  toolName: string,
  description: string
): void {
  const searxng = createSearxngClient(config)

  server.tool(
    toolName,
    description,
    searchParams,
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async (params) => {
      log(`${toolName}: query="${params.query}"`)

      try {
        const s: SearxngSearchParams = {
          q: params.query,
          format: 'json',
          pageno: params.pageno,
          time_range: params.time_range,
          language: params.language,
          categories: params.categories,
          engines: params.engines,
          safesearch: params.safesearch,
        }

        const response = await searxng.search(s)

        const seen = new Set<string>()
        const filtered = response.results.filter((r) => {
          if (seen.has(r.url)) return false
          if (!filterByDomains(r.url, params.includeDomains, params.excludeDomains)) return false
          if (!filterByDate(r.publishedDate, params.startPublishedDate, params.endPublishedDate)) return false
          seen.add(r.url)
          return true
        })

        response.results = filtered.slice(0, params.count)
        log(`Returning ${response.results.length} results`)

        return {
          content: [{
            type: 'text' as const,
            text: formatFullSearchResponse(response),
          }],
        }
      } catch (err) {
        return formatErrorResponse(err)
      }
    }
  )
}

export function registerWebSearchTool(server: McpServer, config: ServerConfig): void {
  registerSearchTool(
    server, config, 'web_search',
    'Web search via SearXNG (metasearch). '
    + 'Aggregates Google, DuckDuckGo, Brave, Wikipedia and more. '
    + 'Returns titles, URLs and snippets, plus direct answers and infoboxes when available. '
    + 'Supports category (news, images), time range (day, month, year), '
    + 'domain (include/exclude) filters, specific engines and safe search. '
    + 'Use for questions requiring up-to-date information from the internet.'
  )
}

export function registerWebSearchAdvancedTool(server: McpServer, config: ServerConfig): void {
  registerSearchTool(
    server, config, 'web_search_advanced',
    'Advanced web search with full filter control: domains, exact dates, '
    + 'specific engines, categories, safe search. '
    + 'Use when you need precise filtering — '
    + 'e.g. "articles from the last month only from arxiv.org and github.com". '
    + 'Includes direct answers, infoboxes, suggestions and spelling corrections.'
  )
}
