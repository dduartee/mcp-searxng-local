/**
 * searxng.ts
 * Cliente HTTP para a API do SearXNG.
 *
 * O SearXNG expõe uma API REST simples:
 *   GET /search?q=<query>&format=json&...
 *
 * Abstrai a comunicação HTTP e o parsing da resposta.
 * O MCP server nunca chama o SearXNG diretamente — sempre via este módulo.
 */

import axios from 'axios'
import type { SearxngResponse, SearxngSearchParams, ServerConfig } from '../types.js'
import { SearxngConnectionError, SearxngResponseError } from '../utils/errors.js'
import { log } from '../utils/logger.js'
import { withRetry } from '../utils/retry.js'
import { MemoryCache } from '../utils/cache.js'

/**
 * Cria uma instância do cliente SearXNG.
 * Factory function para permitir config fácil.
 */
export function createSearxngClient(config: ServerConfig) {
  const baseURL = `http://${config.searxngHost || 'localhost'}:${config.searxngPort || 4000}`
  const timeout = config.searxngTimeout || 10000
  const cache = new MemoryCache<SearxngResponse>(100)

  log(`SearXNG client configurado: ${baseURL}, timeout: ${timeout}ms`)

  function cacheKey(params: SearxngSearchParams): string {
    return [
      params.q,
      params.categories ?? '',
      params.language ?? '',
      params.pageno ?? 1,
      params.time_range ?? '',
      params.engines ?? '',
    ].join('|')
  }

  /**
   * Executa uma busca no SearXNG e retorna a resposta parseada.
   *
   * @param params - Parâmetros da busca (query, categorias, página, etc.)
   * @param signal - AbortSignal para cancelamento (opcional)
   */
  async function search(
    params: SearxngSearchParams,
    signal?: AbortSignal
  ): Promise<SearxngResponse> {
    const key = cacheKey(params)
    const cached = cache.get(key)
    if (cached) {
      log(`Cache hit: "${params.q}"`)
      return cached
    }

    const url = `${baseURL}/search`

    log(`Buscando: ${params.q}`)

    async function makeRequest(): Promise<SearxngResponse> {
      const response = await axios.get<SearxngResponse>(url, {
        params: {
          q: params.q,
          format: 'json',
          categories: params.categories,
          language: params.language,
          pageno: params.pageno,
          time_range: params.time_range,
          safesearch: params.safesearch,
          engines: params.engines,
        },
        timeout,
        signal,
        validateStatus: () => true,
      })

      if (response.status === 403) {
        throw new SearxngResponseError(
          'SearXNG retornou 403 Forbidden. Verifique se "json" está em search.formats no settings.yml.',
          response.status
        )
      }

      if (response.status === 404) {
        throw new SearxngResponseError(
          'SearXNG retornou 404. Verifique a URL base no docker-compose.',
          response.status
        )
      }

      if (response.status === 429 || response.status >= 500) {
        throw new SearxngConnectionError(
          `SearXNG retornou status ${response.status} — tentando novamente...`
        )
      }

      if (response.status !== 200) {
        throw new SearxngResponseError(
          `SearXNG retornou status ${response.status}.`,
          response.status
        )
      }

      log(`Recebidos ${response.data.results?.length || 0} resultados`)
      return response.data
    }

    try {
      const result = await withRetry(makeRequest, {
        maxRetries: 3,
        baseDelayMs: 500,
      })
      cache.set(key, result, 5 * 60 * 1000) // 5 min TTL
      return result
    } catch (err) {
      if (axios.isCancel(err)) {
        throw new SearxngConnectionError('Requisição cancelada.')
      }
      if (err instanceof SearxngResponseError) {
        throw err
      }
      throw new SearxngConnectionError(
        `Não foi possível conectar ao SearXNG em ${baseURL}. `
        + 'Execute "docker compose up -d" primeiro.',
        err
      )
    }
  }

  /**
   * Verifica se o SearXNG está respondendo.
   * Útil no startup para dar feedback imediato.
   */
  async function healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${baseURL}/search`, {
        params: { q: 'health', format: 'json', pageno: 1 },
        timeout: 3000,
        validateStatus: () => true,
      })
      return true
    } catch {
      return false
    }
  }

  return { search, healthCheck }
}

export type SearxngClient = ReturnType<typeof createSearxngClient>
