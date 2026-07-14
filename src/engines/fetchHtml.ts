/**
 * fetchHtml.ts
 * Utilitário para extrair conteúdo de páginas web (web_fetch).
 *
 * Estratégia:
 * 1. fetch() na URL alvo
 * 2. cheerio para parsear o HTML
 * 3. Remove tags irrelevantes (script, style, nav, footer, header)
 * 4. Extrai título, meta description e texto limpo
 * 5. Limita por maxChars para evitar estourar o contexto do Claude
 *
 * Não usa Puppeteer/Playwright propositalmente:
 * - Mais leve (sem depender de Chromium)
 * - Mais rápido (sem renderizar JS)
 * - Contras: não executa JavaScript, páginas SPA podem vir vazias
 */

import * as cheerio from 'cheerio'
import { FetchError } from '../utils/errors.js'
import { withRetry } from '../utils/retry.js'

export interface ExtractedContent {
  title: string
  description: string | null
  text: string
}

/**
 * Faz fetch de uma URL e extrai o conteúdo como texto limpo.
 * Ideal para páginas estáticas (artigos, blogs, documentação).
 *
 * @param url - URL completa (precisa incluir http:// ou https://)
 * @param signal - AbortSignal opcional para timeout/cancelamento
 */
export async function extractFromUrl(
  url: string,
  signal?: AbortSignal
): Promise<ExtractedContent> {
  // Validação básica da URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new FetchError('URL precisa começar com http:// ou https://', url)
  }

  let response: Response
  try {
    response = await withRetry(
      () => fetch(url, {
        signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Search-Local/0.1)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      }),
      { maxRetries: 2, baseDelayMs: 1000 }
    )
  } catch (err) {
    throw new FetchError(
      err instanceof Error ? err.message : 'Falha na requisição',
      url
    )
  }

  if (response.status === 429 || response.status >= 500) {
    response = await withRetry(
      () => fetch(url, {
        signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCP-Search-Local/0.1)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      }),
      { maxRetries: 2, baseDelayMs: 2000 }
    )
  }

  if (!response.ok) {
    throw new FetchError(
      `HTTP ${response.status}: ${response.statusText}`,
      url,
      response.status
    )
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  // Extrai título da página
  const title = $('title').first().text().trim() || url

  // Extrai meta description
  const description =
    $('meta[name="description"]').attr('content')?.trim() || null

  // Remove elementos que não são conteúdo principal
  $('script, style, nav, footer, header, aside, .sidebar, .menu, iframe').remove()

  // Extrai o texto limpo do body
  const text = $('body')
    .text()
    .replace(/\n{3,}/g, '\n\n')
    .split('\n\n')
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .join('\n\n')
    .trim()

  if (!text) {
    throw new FetchError('Página vazia ou sem conteúdo textual. Pode ser uma SPA que precisa de JavaScript.', url)
  }

  return { title, description, text }
}
