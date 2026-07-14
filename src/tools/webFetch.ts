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
    .describe('URL completa da página para extrair conteúdo (ex: https://example.com)'),
  maxChars: z.number()
    .int().min(100).max(50000).default(5000)
    .describe('Máximo de caracteres do conteúdo (100-50000, padrão 5000)'),
  mode: z.enum(['text', 'highlights'])
    .default('text')
    .describe('Modo: "text" retorna página completa; "highlights" extrai trechos relevantes (requer query)'),
  query: z.string()
    .optional()
    .describe('Query para extrair highlights — use a mesma query do web_search que levou a esta URL'),
} as const

export function registerWebFetchTool(
  server: McpServer,
  config: ServerConfig
): void {
  const fetchTimeout = 15000

  server.tool(
    'web_fetch',
    'Extrai o conteúdo de uma página web como texto limpo. '
    + 'Suporta dois modos: "text" (página completa, padrão) e "highlights" '
    + '(trechos mais relevantes para uma query, ~10x menos tokens). '
    + 'Prefira "highlights" com query para buscas factuais. '
    + 'Use "text" para análise profunda. '
    + 'Ideal para ler artigos, documentação e blogs.',
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
          return formatErrorResponse(new Error(`Timeout: a página demorou mais de ${fetchTimeout / 1000}s para responder`))
        }
        return formatErrorResponse(err)
      }
    }
  )
}
