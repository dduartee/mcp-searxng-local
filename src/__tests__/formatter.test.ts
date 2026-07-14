import { describe, it, expect } from 'vitest'
import { formatSearchResults, formatPageContent, extractHighlights, formatFullSearchResponse } from '../utils/formatter.js'
import type { SearxngResult, SearxngResponse } from '../types.js'

describe('formatSearchResults', () => {
  it('retorna mensagem de vazio para array vazio', () => {
    expect(formatSearchResults([])).toContain('Nenhum resultado encontrado')
  })

  it('formata resultados com título, URL e engine', () => {
    const results: SearxngResult[] = [{
      title: 'Test Page', url: 'https://example.com', content: 'snippet',
      engine: 'google', category: 'general',
    }]
    const result = formatSearchResults(results)
    expect(result).toContain('Test Page')
    expect(result).toContain('https://example.com')
    expect(result).toContain('google')
  })

  it('suprime engine quando includeEngine=false', () => {
    const results: SearxngResult[] = [{
      title: 'T', url: 'https://x.com', content: '', engine: 'g', category: 'general',
    }]
    expect(formatSearchResults(results, false)).not.toContain('Engine:')
    expect(formatSearchResults(results, true)).toContain('Engine:')
  })
})

describe('formatFullSearchResponse', () => {
  const baseResponse: SearxngResponse = {
    query: 'test', results: [], answers: [], infoboxes: [],
    corrections: [], suggestions: [], unresponsive_engines: [],
  }

  it('inclui answers quando presentes', () => {
    const r = { ...baseResponse, answers: ['Paris is the capital of France'] }
    expect(formatFullSearchResponse(r)).toContain('Respostas diretas')
    expect(formatFullSearchResponse(r)).toContain('Paris')
  })

  it('inclui infoboxes quando presentes', () => {
    const r = { ...baseResponse, infoboxes: [{ infobox: 'Wikipedia', content: 'info', url: 'https://x.com' }] }
    expect(formatFullSearchResponse(r)).toContain('Infoboxes')
    expect(formatFullSearchResponse(r)).toContain('Wikipedia')
  })

  it('inclui suggestions e corrections', () => {
    const r = { ...baseResponse, suggestions: ['did you mean X?'], corrections: ['spelling fix'] }
    const out = formatFullSearchResponse(r)
    expect(out).toContain('Sugestões')
    expect(out).toContain('Correções')
  })

  it('não inclui seções vazias', () => {
    const out = formatFullSearchResponse(baseResponse)
    expect(out).not.toContain('Respostas diretas')
    expect(out).not.toContain('Infoboxes')
    expect(out).toContain('Resultados')
  })
})

describe('extractHighlights', () => {
  const text = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    'The Rust programming language is fast and memory-efficient.',
    'Memory safety without garbage collection is a key feature.',
    'Rust has a steep learning curve but excellent tooling.',
    'Many companies are adopting Rust for systems programming.',
  ].join('\n\n')

  it('extrai parágrafos relevantes por keyword match', () => {
    const result = extractHighlights(text, 'Rust programming language', 500)
    expect(result).toContain('Rust programming language')
    expect(result).not.toContain('Lorem ipsum')
  })

  it('limita por maxChars', () => {
    const result = extractHighlights(text, 'Rust', 80)
    expect(result.length).toBeLessThanOrEqual(100)
  })

  it('retorna vazio quando nada relevante', () => {
    const result = extractHighlights(text, 'xyzabc123', 100)
    expect(result).toBe('')
  })
})

describe('formatPageContent', () => {
  it('usa mode highlights com query', () => {
    const text = 'This is just some irrelevant introductory text that does not matter at all.\n\n'
      + 'Rust is a great language for building command-line tools. It provides memory safety without garbage collection.\n\n'
      + 'More irrelevant content that nobody cares about in this context.'
    const result = formatPageContent('https://ex.com', 'Page', null, text, 500, 'highlights', 'Rust CLI tools')
    expect(result).toContain('Rust')
    expect(result).toContain('Trechos relevantes')
  })

  it('fallback para text completo quando query não casa', () => {
    const text = 'Some random content here about flowers.\n\n'
      + 'More gardening stuff that has nothing to do with the search.\n\n'
      + 'Additional plant-related information here too more words fill.'
    const result = formatPageContent('https://ex.com', 'Page', null, text, 500, 'highlights', 'xyz')
    expect(result).toContain('random content')
    expect(result).not.toContain('Trechos relevantes')
  })
})
