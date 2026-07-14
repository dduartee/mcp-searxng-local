/**
 * types.ts
 * Shared types across MCP server modules.
 */

export interface SearxngResult {
  title: string
  url: string
  content: string
  engine: string
  category: string
  author?: string | null
  publishedDate?: string | null
  img_src?: string | null
  thumbnail?: string | null
}

export interface SearxngResponse {
  query: string
  results: SearxngResult[]
  answers: string[]
  infoboxes: Array<{
    infobox: string
    content: string
    url: string
  }>
  corrections: string[]
  suggestions: string[]
  unresponsive_engines: string[]
  search_duration?: number
}

export interface SearxngSearchParams {
  q: string
  categories?: string
  language?: string
  pageno?: number
  time_range?: 'day' | 'month' | 'year'
  safesearch?: number
  engines?: string
  format: 'json'
}

export interface WebSearchParams {
  query: string
  count?: number
  pageno?: number
  categories?: string
  time_range?: 'day' | 'month' | 'year'
  language?: string
  /** Include only specific domains (client-side filter) */
  includeDomains?: string[]
  /** Exclude specific domains (client-side filter) */
  excludeDomains?: string[]
  /** Engines do SearXNG: google, duckduckgo, brave, wikipedia, arxiv */
  engines?: string
  /** safe search: 0=off, 1=moderate, 2=strict */
  safesearch?: number
  /** ISO date: "2024-01-01" — results published after this date (client-side) */
  startPublishedDate?: string
  /** ISO date: "2024-12-31" — results published before this date (client-side) */
  endPublishedDate?: string
}

export interface WebSearchAdvancedParams extends WebSearchParams {}

export interface WebFetchParams {
  url: string
  maxChars?: number
  /** Query to extract highlights (relevant excerpts) instead of the full page */
  query?: string
  /** Mode: text (full page) or highlights (relevant excerpts only) */
  mode?: 'text' | 'highlights'
}

export interface ToolMetadata {
  id: string
  name: string
  description: string
  enabled: boolean
}

export interface ServerConfig {
  searxngPort?: number
  searxngHost?: string
  searxngTimeout?: number
  /** Fallback SearXNG instance URLs, tried when local instance returns 0 results */
  searxngFallbackUrls?: string[]
  debug?: boolean
}
