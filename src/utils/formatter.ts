/**
 * formatter.ts
 * Formata os resultados brutos do SearXNG e conteúdo de páginas
 * em texto markdown para consumo via MCP.
 */

import type { SearxngResult, SearxngResponse } from '../types.js'

export function formatSearchResults(
  results: SearxngResult[],
  includeEngine?: boolean
): string {
  if (results.length === 0) {
    return 'Nenhum resultado encontrado. Tente uma query diferente.'
  }

  return results
    .map((r, i) => {
      const lines: string[] = [
        `${i + 1}. **${r.title || '(sem título)'}**`,
        `   URL: ${r.url}`,
      ]
      if (includeEngine !== false) {
        lines.push(`   Engine: ${r.engine}`)
      }
      if (r.publishedDate) {
        lines.push(`   Publicado: ${r.publishedDate}`)
      }
      if (r.author) {
        lines.push(`   Autor: ${r.author}`)
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
    sections.push('## Respostas diretas\n')
    response.answers.forEach((a) => sections.push(`- ${a}`))
    sections.push('')
  }

  if (response.infoboxes.length > 0) {
    sections.push('## Infoboxes\n')
    response.infoboxes.forEach((ib) => {
      sections.push(`- **${ib.infobox}**: ${ib.content.slice(0, 300)}`)
      if (ib.url) sections.push(`  Fonte: ${ib.url}`)
    })
    sections.push('')
  }

  if (response.suggestions.length > 0) {
    sections.push('## Sugestões de busca\n')
    response.suggestions.forEach((s) => sections.push(`- ${s}`))
    sections.push('')
  }

  if (response.corrections.length > 0) {
    sections.push('## Correções ortográficas\n')
    response.corrections.forEach((c) => sections.push(`- ${c}`))
    sections.push('')
  }

  sections.push('## Resultados\n')
  sections.push(formatSearchResults(response.results))

  if (response.unresponsive_engines.length > 0) {
    sections.push('')
    sections.push('## Engines indisponíveis\n')
    response.unresponsive_engines.forEach((e) => {
      const name = Array.isArray(e) ? e[0] : e
      const reason = Array.isArray(e) ? e[1] : 'desconhecido'
      sections.push(`- **${name}**: ${reason}`)
    })
  }

  return sections.join('\n')
}

/**
 * Extrai parágrafos relevantes de um texto baseado em palavras-chave.
 * Usa TF simples — conta quantas palavras da query aparecem em cada parágrafo.
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
        + `\n\n> *Trechos relevantes (${highlights.length} de ${text.length} caracteres, ~${pct}% menor). Use mode=text para página completa.*`
    } else {
      content = maxChars && text.length > maxChars
        ? text.slice(0, maxChars) + '\n\n[... conteúdo truncado ...]'
        : text
    }
  } else {
    content = maxChars && text.length > maxChars
      ? text.slice(0, maxChars) + '\n\n[... conteúdo truncado ...]'
      : text
  }

  const lines: string[] = [
    `# ${title || '(sem título)'}`,
    `Fonte: ${url}`,
  ]
  if (description) {
    lines.push(`Descrição: ${description}`)
  }
  lines.push('', content)

  return lines.join('\n')
}
