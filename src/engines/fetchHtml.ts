/**
 * fetchHtml.ts
 * Utility for extracting content from web pages (web_fetch).
 *
 * Strategy:
 * 1. fetch() the target URL
 * 2. cheerio to parse the HTML
 * 3. Remove irrelevant tags (script, style, nav, footer, header)
 * 4. Extract title, meta description and clean text
 * 5. Limit by maxChars to avoid overflowing Claude's context
 *
 * Intentionally does not use Puppeteer/Playwright:
 * - Lighter (no Chromium dependency)
 * - Faster (no JS rendering)
 * - Downside: no JavaScript execution, SPA pages may come back empty
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
 * Fetches a URL and extracts content as clean text.
 * Ideal for static pages (articles, blogs, documentation).
 *
 * @param url - Full URL (must include http:// or https://)
 * @param signal - Optional AbortSignal for timeout/cancellation
 */
export async function extractFromUrl(
  url: string,
  signal?: AbortSignal
): Promise<ExtractedContent> {
  // Basic URL validation
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new FetchError('URL must start with http:// or https://', url)
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
      err instanceof Error ? err.message : 'Request failed',
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

  // Extract page title
  const title = $('title').first().text().trim() || url

  // Extract meta description
  const description =
    $('meta[name="description"]').attr('content')?.trim() || null

  // Remove elements that are not main content
  $('script, style, nav, footer, header, aside, .sidebar, .menu, iframe').remove()

  // Extract clean text from body
  const text = $('body')
    .text()
    .replace(/\n{3,}/g, '\n\n')
    .split('\n\n')
    .map((p) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .join('\n\n')
    .trim()

  if (!text) {
    throw new FetchError('Empty page or no text content. It may be an SPA that requires JavaScript.', url)
  }

  return { title, description, text }
}
