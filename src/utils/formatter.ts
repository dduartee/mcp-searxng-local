/**
 * formatter.ts
 * Formats raw SearXNG results and page content into markdown text for MCP consumption.
 */

import type { SearxngResult, SearxngResponse } from '../types.js'

export function formatSearchResults(
  results: SearxngResult[],
  includeEngine?: boolean
): string {
  if (results.length === 0) {
    return 'No results found. Try a different query.'
  }

  return results
    .map((r, i) => {
      const lines: string[] = [
        `${i + 1}. **${r.title || '(untitled)'}**`,
        `   URL: ${r.url}`,
      ]
      if (includeEngine !== false) {
        lines.push(`   Engine: ${r.engine}`)
      }
      if (r.publishedDate) {
        lines.push(`   Published: ${r.publishedDate}`)
      }
      if (r.author) {
        lines.push(`   Author: ${r.author}`)
      }
      if (r.content) {
        lines.push(`   ${r.content}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

/**
 * Formata a resposta completa do SearXNG, incluindo
 * answers, infoboxes, suggestions, corrections e resultados.
 */
export function formatFullSearchResponse(response: SearxngResponse): string {
  const sections: string[] = []

  if (response.answers.length > 0) {
    sections.push('## Direct Answers\n')
    response.answers.forEach((a) => sections.push(`- ${a}`))
    sections.push('')
  }

  if (response.infoboxes.length > 0) {
    sections.push('## Infoboxes\n')
    response.infoboxes.forEach((ib) => {
      sections.push(`- **${ib.infobox}**: ${ib.content.slice(0, 300)}`)
      if (ib.url) sections.push(`  Source: ${ib.url}`)
    })
    sections.push('')
  }

  if (response.suggestions.length > 0) {
    sections.push('## Search Suggestions\n')
    response.suggestions.forEach((s) => sections.push(`- ${s}`))
    sections.push('')
  }

  if (response.corrections.length > 0) {
    sections.push('## Spelling Corrections\n')
    response.corrections.forEach((c) => sections.push(`- ${c}`))
    sections.push('')
  }

  sections.push('## Results\n')
  sections.push(formatSearchResults(response.results))

  if (response.unresponsive_engines.length > 0) {
    sections.push('')
    sections.push('## Unresponsive Engines\n')
    response.unresponsive_engines.forEach((e) => {
      const name = Array.isArray(e) ? e[0] : e
      const reason = Array.isArray(e) ? e[1] : 'unknown'
      sections.push(`- **${name}**: ${reason}`)
    })
  }

  return sections.join('\n')
}

/**
 * Extracts relevant paragraphs from text based on keyword matching.
 * Uses simple TF — counts how many query words appear in each paragraph.
 */
export function extractHighlights(text: string, query: string, maxChars = 800): string {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)

  if (queryWords.length === 0) return ''

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)

  if (paragraphs.length === 0) return ''

  const scored = paragraphs.map((p) => {
    const lower = p.toLowerCase()
    let score = 0
    for (const word of queryWords) {
      const count = lower.split(word).length - 1
      score += count
    }
    return { text: p, score, density: score / Math.max(p.length, 1) }
  })

  scored.sort((a, b) => b.density - a.density)

  const selected: string[] = []
  let totalChars = 0
  for (const s of scored) {
    if (s.score === 0) continue
    if (totalChars + s.text.length > maxChars && selected.length > 0) break
    selected.push(s.text)
    totalChars += s.text.length
  }

  return selected.join('\n\n')
}

export function formatPageContent(
  url: string,
  title: string,
  description: string | null,
  text: string,
  maxChars?: number,
  mode: 'text' | 'highlights' = 'text',
  highlightQuery?: string
): string {
  let content: string

  if (mode === 'highlights' && highlightQuery) {
    const highlights = extractHighlights(text, highlightQuery, maxChars ?? 800)
    if (highlights.length > 0) {
      const pct = text.length > 0 ? Math.round((1 - highlights.length / text.length) * 100) : 0
      content = highlights
        + `\n\n> *Relevant excerpts (${highlights.length} of ${text.length} characters, ~${pct}% smaller). Use mode=text for full page.*`
    } else {
      content = maxChars && text.length > maxChars
        ? text.slice(0, maxChars) + '\n\n[... content truncated ...]'
        : text
    }
  } else {
    content = maxChars && text.length > maxChars
      ? text.slice(0, maxChars) + '\n\n[... content truncated ...]'
      : text
  }

  const lines: string[] = [
    `# ${title || '(untitled)'}`,
    `Source: ${url}`,
  ]
  if (description) {
    lines.push(`Description: ${description}`)
  }
  lines.push('', content)

  return lines.join('\n')
}
