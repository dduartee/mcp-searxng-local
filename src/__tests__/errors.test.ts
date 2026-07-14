import { describe, it, expect } from 'vitest'
import {
  SearxngConnectionError,
  SearxngResponseError,
  FetchError,
  formatErrorResponse,
} from '../utils/errors.js'

describe('formatErrorResponse', () => {
  it('formata SearxngConnectionError', () => {
    const err = new SearxngConnectionError('host down', new Error('ECONNREFUSED'))
    const res = formatErrorResponse(err)
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('Erro de conexão')
    expect(res.content[0].text).toContain('docker compose up -d')
  })

  it('formata FetchError', () => {
    const err = new FetchError('Not Found', 'https://ex.com', 404)
    const res = formatErrorResponse(err)
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('Erro ao acessar a URL')
    expect(res.content[0].text).toContain('https://ex.com')
  })

  it('formata Error genérico', () => {
    const res = formatErrorResponse(new Error('something broke'))
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('Erro inesperado')
    expect(res.content[0].text).toContain('something broke')
  })

  it('formata unknown error', () => {
    const res = formatErrorResponse('string error')
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('Erro desconhecido')
  })

  it('formata SearxngResponseError', () => {
    const err = new SearxngResponseError('Forbidden', 403)
    const res = formatErrorResponse(err)
    expect(res.isError).toBe(true)
    expect(res.content[0].text).toContain('Erro do SearXNG')
    expect(res.content[0].text).toContain('403')
  })
})

describe('custom errors', () => {
  it('SearxngConnectionError tem name correto', () => {
    const err = new SearxngConnectionError('msg')
    expect(err.name).toBe('SearxngConnectionError')
    expect(err).toBeInstanceOf(Error)
  })

  it('SearxngResponseError tem name correto', () => {
    const err = new SearxngResponseError('msg', 500)
    expect(err.name).toBe('SearxngResponseError')
    expect(err.statusCode).toBe(500)
  })

  it('FetchError tem name correto', () => {
    const err = new FetchError('msg', 'https://x.com', 404)
    expect(err.name).toBe('FetchError')
    expect(err.url).toBe('https://x.com')
    expect(err.statusCode).toBe(404)
  })
})
