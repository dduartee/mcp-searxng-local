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
    .describe('Termo de busca. Ex: "últimas notícias inteligência artificial 2026"'),
  count: z.number()
    .int().min(1).max(50).default(10)
    .describe('Número de resultados (1-50, padrão 10)'),
  pageno: z.number()
    .int().min(1).default(1)
    .describe('Página de resultados (padrão 1)'),
  categories: z.enum(['general', 'news', 'images', 'files', 'video', 'music'])
    .optional()
    .describe('Categoria: general, news, images, files, video, music'),
  time_range: z.enum(['day', 'month', 'year'])
    .optional()
    .describe('Filtro temporal: day, month ou year'),
  language: z.string()
    .optional()
    .describe('Código do idioma: pt-BR, en-US, etc.'),
  includeDomains: z.array(z.string())
    .optional()
    .describe('Apenas resultados destes domínios (ex: ["github.com", "wikipedia.org"])'),
  excludeDomains: z.array(z.string())
    .optional()
    .describe('Excluir resultados destes domínios (ex: ["pinterest.com"])'),
  engines: z.string()
    .optional()
    .describe('Selecionar engines: google, duckduckgo, brave, wikipedia, arxiv (separados por vírgula)'),
  safesearch: z.number()
    .int().min(0).max(2)
    .optional()
    .describe('Safe search: 0=off, 1=moderate, 2=strict'),
  startPublishedDate: z.string()
    .optional()
    .describe('Data ISO: "2024-01-01" — filtrar resultados publicados após esta data (client-side)'),
  endPublishedDate: z.string()
    .optional()
    .describe('Data ISO: "2024-12-31" — filtrar resultados publicados antes desta data (client-side)'),
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
  if (!publishedDate) return false // sem data = excluir quando filtro de data ativo
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
        log(`Retornando ${response.results.length} resultados`)

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
    'Busca na web usando SearXNG (metasearch). '
    + 'Agrega Google, DuckDuckGo, Brave, Wikipedia e mais. '
    + 'Retorna títulos, URLs e snippets, além de respostas diretas e infoboxes quando disponíveis. '
    + 'Suporta filtro por categoria (news, images), período (day, month, year), '
    + 'domínios (include/exclude), engines específicos e safe search. '
    + 'Use para perguntas que exigem informação atualizada da internet.'
  )
}

export function registerWebSearchAdvancedTool(server: McpServer, config: ServerConfig): void {
  registerSearchTool(
    server, config, 'web_search_advanced',
    'Busca web avançada com controle total sobre filtros: domínios, datas exatas, '
    + 'engines específicos, categorias, safe search. '
    + 'Use quando precisar de filtragem precisa — '
    + 'ex: "artigos do último mês apenas do arxiv.org e github.com". '
    + 'Inclui respostas diretas, infoboxes, sugestões e correções ortográficas.'
  )
}
