/**
 * types.ts
 * Tipos compartilhados entre os módulos do MCP server.
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
  /** Incluir apenas domínios específicos (filtro client-side) */
  includeDomains?: string[]
  /** Excluir domínios específicos (filtro client-side) */
  excludeDomains?: string[]
  /** Engines do SearXNG: google, duckduckgo, brave, wikipedia, arxiv */
  engines?: string
  /** safe search: 0=off, 1=moderate, 2=strict */
  safesearch?: number
  /** Data ISO: "2024-01-01" — resultados publicados após esta data (client-side) */
  startPublishedDate?: string
  /** Data ISO: "2024-12-31" — resultados publicados antes desta data (client-side) */
  endPublishedDate?: string
}

export interface WebSearchAdvancedParams extends WebSearchParams {}

export interface WebFetchParams {
  url: string
  maxChars?: number
  /** Query para extrair highlights (trechos relevantes) em vez da página inteira */
  query?: string
  /** Modo: text (página inteira) ou highlights (só trechos relevantes) */
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
  debug?: boolean
}
