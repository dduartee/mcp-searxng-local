/**
 * searxng.ts
 * HTTP client for the SearXNG API.
 *
 * SearXNG exposes a simple REST API:
 *   GET /search?q=<query>&format=json&...
 *
 * Abstracts HTTP communication and response parsing.
 * The MCP server never calls SearXNG directly — always through this module.
 */

import axios from 'axios'
import type { SearxngResponse, SearxngSearchParams, ServerConfig } from '../types.js'
import { SearxngConnectionError, SearxngResponseError } from '../utils/errors.js'
import { log } from '../utils/logger.js'
import { withRetry } from '../utils/retry.js'
import { MemoryCache } from '../utils/cache.js'

/**
 * Creates a SearXNG client instance.
 * Factory function for easy configuration.
 */
export function createSearxngClient(config: ServerConfig) {
  const baseURL = `http://${config.searxngHost || 'localhost'}:${config.searxngPort || 4000}`
  const timeout = config.searxngTimeout || 10000
  const fallbackUrls = config.searxngFallbackUrls || []
  const cache = new MemoryCache<SearxngResponse>(100)

  log(`SearXNG client configured: ${baseURL}, timeout: ${timeout}ms`)
  if (fallbackUrls.length > 0) {
    log(`Fallback instances: ${fallbackUrls.join(', ')}`)
  }

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
   * Executes a search on SearXNG and returns the parsed response.
   *
   * @param params - Search parameters (query, categories, page, etc.)
   * @param signal - AbortSignal for cancellation (optional)
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

    log(`Searching: ${params.q}`)

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
          'SearXNG returned 403 Forbidden. Check if "json" is in search.formats in settings.yml.',
          response.status
        )
      }

      if (response.status === 404) {
        throw new SearxngResponseError(
          'SearXNG returned 404. Check the base URL in docker-compose.',
          response.status
        )
      }

      if (response.status === 429 || response.status >= 500) {
        throw new SearxngConnectionError(
          `SearXNG returned status ${response.status} — retrying...`
        )
      }

      if (response.status !== 200) {
        throw new SearxngResponseError(
          `SearXNG returned status ${response.status}.`,
          response.status
        )
      }

      log(`Received ${response.data.results?.length || 0} results`)
      return response.data
    }

    try {
      const result = await withRetry(makeRequest, {
        maxRetries: 3,
        baseDelayMs: 500,
      })

      // If local instance returned 0 results with all engines failing, try fallbacks
      if (result.results.length === 0 && result.unresponsive_engines.length > 0 && fallbackUrls.length > 0) {
        log(`Local instance: all engines failed (${result.unresponsive_engines.length} unresponsive). Trying fallbacks...`)
        for (const fallbackUrl of fallbackUrls) {
          try {
            log(`Trying fallback: ${fallbackUrl}`)
            const fallbackResult = await withRetry(
              () => axios.get<SearxngResponse>(`${fallbackUrl}/search`, {
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
              }).then((r) => {
                if (r.status !== 200) throw new SearxngResponseError(`Fallback returned ${r.status}`, r.status)
                return r.data
              }),
              { maxRetries: 2, baseDelayMs: 1000 }
            )
            if (fallbackResult.results.length > 0) {
              log(`Fallback ${fallbackUrl} returned ${fallbackResult.results.length} results`)
              cache.set(key, fallbackResult, 5 * 60 * 1000)
              return fallbackResult
            }
          } catch (fbErr) {
            log(`Fallback ${fallbackUrl} failed: ${fbErr instanceof Error ? fbErr.message : fbErr}`)
          }
        }
        log('All fallback instances failed too')
      }

      cache.set(key, result, 5 * 60 * 1000) // 5 min TTL
      return result
    } catch (err) {
      if (axios.isCancel(err)) {
        throw new SearxngConnectionError('Request cancelled.')
      }
      if (err instanceof SearxngResponseError) {
        throw err
      }
      throw new SearxngConnectionError(
        `Could not connect to SearXNG at ${baseURL}. `
        + 'Run "docker compose up -d" first.',
        err
      )
    }
  }

  /**
   * Checks if SearXNG is responding.
   * Useful at startup for immediate feedback.
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
